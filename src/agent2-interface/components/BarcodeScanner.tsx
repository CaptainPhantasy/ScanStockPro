'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library';

interface BarcodeScannerProps {
  onScanSuccess: (code: string) => void;
  onScanError?: (error: string) => void;
  className?: string;
}

export function BarcodeScanner({ onScanSuccess, onScanError, className = '' }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize scanner
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    return () => {
      stopScanning();
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);
      setError('Camera access denied. Please enable camera permissions.');
      setHasPermission(false);
      if (onScanError) {
        onScanError('Camera access denied');
      }
      return false;
    }
  }, [onScanError]);

  const startScanning = useCallback(async () => {
    if (!codeReaderRef.current || !videoRef.current) return;

    try {
      setIsScanning(true);
      setError(null);

      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      // Get available devices and prefer back camera
      const devices = await codeReaderRef.current.listVideoInputDevices();
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('environment')
      );
      const selectedDevice = backCamera || devices[0];

      if (!selectedDevice) {
        throw new Error('No camera devices found');
      }

      // Start continuous scanning
      await codeReaderRef.current.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current,
        (result: Result | null, err?: any) => {
          if (result) {
            const text = result.getText();
            console.log('Scanned:', text);
            onScanSuccess(text);
            
            // Vibrate on successful scan (mobile)
            if ('vibrate' in navigator) {
              navigator.vibrate(200);
            }
            
            // Continue scanning for next code
            // Stop and restart to avoid duplicate scans
            setTimeout(() => {
              if (isScanning) {
                startScanning();
              }
            }, 2000);
          }
          
          if (err && !(err instanceof NotFoundException)) {
            console.error('Scan error:', err);
            if (onScanError) {
              onScanError(err.message || 'Scanning error occurred');
            }
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setError(err.message || 'Failed to start camera');
      setIsScanning(false);
      if (onScanError) {
        onScanError(err.message || 'Failed to start scanner');
      }
    }
  }, [onScanSuccess, onScanError, requestCameraPermission]);

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsScanning(false);
  }, []);

  const toggleScanning = useCallback(() => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  }, [isScanning, startScanning, stopScanning]);

  return (
    <div className={`relative ${className}`}>
      {/* Video preview */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ minHeight: '300px' }}
          playsInline
          muted
        />
        
        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scan line animation */}
            <div className="absolute inset-x-0 h-0.5 bg-blue-500 animate-scan-line" />
            
            {/* Corner brackets */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500" />
              </div>
            </div>
          </div>
        )}
        
        {/* Status overlay */}
        {!isScanning && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p>Click to start scanning</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Control button */}
      <button
        onClick={toggleScanning}
        className={`mt-4 w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
          isScanning
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isScanning ? 'Stop Scanning' : 'Start Scanning'}
      </button>
      
      {/* Manual entry fallback */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Can't scan? Enter barcode manually
        </p>
      </div>
    </div>
  );
}

// Add CSS for scan line animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes scan-line {
      0% { transform: translateY(0); }
      50% { transform: translateY(300px); }
      100% { transform: translateY(0); }
    }
    .animate-scan-line {
      animation: scan-line 2s infinite;
    }
  `;
  document.head.appendChild(style);
}