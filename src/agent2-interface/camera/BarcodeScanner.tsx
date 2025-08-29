'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import Webcam from 'react-webcam';
import type { BarcodeData, ImageData } from '../../shared/contracts/agent-interfaces';

interface BarcodeScannerProps {
  onScanComplete: (data: BarcodeData) => void;
  onImageCapture?: (data: ImageData) => void;
  flashEnabled?: boolean;
  scanMode?: 'barcode' | 'image' | 'voice';
  className?: string;
  disabled?: boolean;
}

export const BarcodeScanner = ({
  onScanComplete,
  onImageCapture,
  flashEnabled = false,
  scanMode = 'barcode',
  className = '',
  disabled = false,
}: BarcodeScannerProps) => {
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const webcamRef = useRef<Webcam>(null);
  const readerRef = useRef<BrowserMultiFormatReader>();
  const scanIntervalRef = useRef<NodeJS.Timeout>();
  const videoElementRef = useRef<HTMLVideoElement>();

  const hapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [25],
        medium: [100],
        heavy: [200, 100, 200],
      };
      navigator.vibrate(patterns[intensity]);
    }
  }, []);

  // Initialize camera and barcode reader
  useEffect(() => {
    const initCamera = async () => {
      try {
        setIsInitializing(true);
        
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        });
        
        setPermission('granted');
        
        // Initialize ZXing reader with optimized settings
        readerRef.current = new BrowserMultiFormatReader();
        
        // Configure hints for better performance
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        
        readerRef.current.setHints(hints);
        
        // Release the stream (webcam component will handle it)
        stream.getTracks().forEach(track => track.stop());
        
      } catch (error) {
        console.error('Camera initialization failed:', error);
        setPermission('denied');
      } finally {
        setIsInitializing(false);
      }
    };

    initCamera();

    return () => {
      // Cleanup
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  // Start/stop scanning based on mode and permission
  useEffect(() => {
    if (permission !== 'granted' || disabled) {
      stopScanning();
      return;
    }

    if (scanMode === 'barcode') {
      startScanning();
    } else {
      stopScanning();
    }

    return stopScanning;
  }, [scanMode, permission, disabled]);

  const startScanning = useCallback(() => {
    if (isScanning || !readerRef.current) return;
    
    setIsScanning(true);
    
    scanIntervalRef.current = setInterval(() => {
      scanBarcode();
    }, 500); // Scan every 500ms for performance
  }, [isScanning]);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = undefined;
    }
    setIsScanning(false);
  }, []);

  const scanBarcode = useCallback(async () => {
    if (!webcamRef.current || !readerRef.current) return;

    try {
      const video = webcamRef.current.video;
      if (!video || video.readyState !== 4) return; // Not ready
      
      // Prevent too frequent scans
      const now = Date.now();
      if (now - lastScanTime < 1000) return; // 1 second cooldown
      
      // Use decodeFromVideoElement instead
      const result = await readerRef.current.decodeFromVideoElement(video);
      
      if (result) {
        const barcodeData: BarcodeData = {
          code: result.getText(),
          format: result.getBarcodeFormat().toString(),
          confidence: 1.0, // ZXing doesn't provide confidence
          timestamp: new Date(),
        };
        
        setLastScanTime(now);
        setScanCount(prev => prev + 1);
        hapticFeedback('heavy');
        
        onScanComplete(barcodeData);
        
        // Brief pause after successful scan
        stopScanning();
        setTimeout(startScanning, 2000);
      }
    } catch (error) {
      // Ignore decode errors - they're expected when no barcode is visible
    }
  }, [lastScanTime, onScanComplete, hapticFeedback, startScanning, stopScanning]);

  const captureImage = useCallback(async () => {
    if (!webcamRef.current) return;

    try {
      const imageSrc = webcamRef.current.getScreenshot({
        width: 1280,
        height: 720,
        quality: 0.8,
      });

      if (imageSrc && onImageCapture) {
        // Convert data URL to blob
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        
        const imageData: ImageData = {
          dataUrl: imageSrc,
          blob,
          metadata: {
            width: 1280,
            height: 720,
            format: 'jpeg',
            size: blob.size,
          },
        };

        hapticFeedback('medium');
        onImageCapture(imageData);
      }
    } catch (error) {
      console.error('Image capture failed:', error);
    }
  }, [onImageCapture, hapticFeedback]);

  const handleVoiceInput = useCallback(() => {
    // TODO: Implement voice recognition for product names
    hapticFeedback('light');
  }, [hapticFeedback]);

  // Permission request UI
  if (permission === 'prompt' || isInitializing) {
    return (
      <div className={`
        flex items-center justify-center bg-neutral-900 text-white
        ${className}
      `}>
        <div className="text-center p-warehouse-lg">
          <div className="text-6xl mb-warehouse-md">📷</div>
          <h2 className="text-mobile-xl font-bold mb-warehouse-sm">
            Camera Access Required
          </h2>
          <p className="text-mobile-base text-neutral-300 mb-warehouse-lg">
            We need camera access to scan barcodes and capture product images.
          </p>
          {isInitializing ? (
            <div className="animate-pulse text-mobile-base">
              Initializing camera...
            </div>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="
                py-warehouse-md px-warehouse-lg
                bg-warehouse-500 hover:bg-warehouse-600
                text-white text-mobile-base font-semibold
                rounded-mobile-lg transition-colors
              "
            >
              Grant Camera Access
            </button>
          )}
        </div>
      </div>
    );
  }

  // Permission denied UI
  if (permission === 'denied') {
    return (
      <div className={`
        flex items-center justify-center bg-neutral-900 text-white
        ${className}
      `}>
        <div className="text-center p-warehouse-lg">
          <div className="text-6xl mb-warehouse-md">❌</div>
          <h2 className="text-mobile-xl font-bold mb-warehouse-sm">
            Camera Access Denied
          </h2>
          <p className="text-mobile-base text-neutral-300 mb-warehouse-lg">
            Please enable camera access in your browser settings to use the scanner.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="
              py-warehouse-md px-warehouse-lg
              bg-warehouse-500 hover:bg-warehouse-600
              text-white text-mobile-base font-semibold
              rounded-mobile-lg transition-colors
            "
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} data-testid="barcode-scanner">
      {/* Webcam Component */}
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: 'environment',
          width: 1280,
          height: 720,
        }}
        className="w-full h-full object-cover"
        onUserMedia={(stream) => {
          videoElementRef.current = webcamRef.current?.video || undefined;
        }}
        onUserMediaError={() => {
          setPermission('denied');
        }}
      />

      {/* Scan Status Overlay */}
      <div className="absolute top-4 left-4 right-4">
        <div className="bg-black/50 backdrop-blur-xs rounded-mobile-lg p-warehouse-sm">
          <div className="flex items-center justify-between text-white text-mobile-sm">
            <div className="flex items-center gap-2">
              <div className={`
                w-2 h-2 rounded-full
                ${isScanning ? 'bg-success-500 animate-pulse' : 'bg-neutral-500'}
              `} />
              <span>
                {scanMode === 'barcode' ? 'Scanning...' : 
                 scanMode === 'image' ? 'Ready to capture' : 
                 'Voice input ready'}
              </span>
            </div>
            <span>Scans: {scanCount}</span>
          </div>
        </div>
      </div>

      {/* Capture Button for Image Mode */}
      {scanMode === 'image' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <button
            onClick={captureImage}
            className="
              w-20 h-20 bg-white rounded-full
              flex items-center justify-center
              text-4xl shadow-lg
              active:scale-95 transition-transform
            "
            data-testid="capture-button"
          >
            📸
          </button>
        </div>
      )}

      {/* Voice Input for Voice Mode */}
      {scanMode === 'voice' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <button
            onClick={handleVoiceInput}
            className="
              w-20 h-20 bg-warehouse-500 rounded-full
              flex items-center justify-center
              text-4xl text-white shadow-lg
              active:scale-95 transition-transform
            "
            data-testid="voice-button"
          >
            🎤
          </button>
        </div>
      )}

      {/* Flash effect overlay */}
      {flashEnabled && (
        <div className="absolute inset-0 bg-white opacity-20 pointer-events-none" />
      )}
    </div>
  );
};