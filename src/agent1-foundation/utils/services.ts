import { supabaseServerClient, MOBILE_CONFIG } from '../config/supabase'
import { 
  CacheService, 
  QueueService, 
  StorageService, 
  EncryptionService 
} from '../../shared/contracts/agent-interfaces'

// In-memory cache implementation (Redis can be added later)
export class MemoryCacheService implements CacheService {
  private cache: Map<string, { value: any; expires: number }> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  async get(key: string): Promise<any> {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }

  async set(key: string, value: any, ttl: number = MOBILE_CONFIG.cacheTTL): Promise<void> {
    const expires = Date.now() + ttl
    this.cache.set(key, { value, expires })
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

// Queue service for offline sync and background processing
export class SupabaseQueueService implements QueueService {
  async enqueue(job: any): Promise<string> {
    try {
      if (!supabaseServerClient) {
        throw new Error('Server client not available')
      }

      const { data, error } = await supabaseServerClient
        .from('sync_queue')
        .insert({
          operation_type: job.operation_type || 'unknown',
          table_name: job.table_name || 'unknown',
          record_id: job.record_id,
          operation_data: job.data || {},
          priority: job.priority || 1,
          user_id: job.user_id,
          device_id: job.device_id || 'unknown',
          scheduled_at: job.scheduled_at || new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) throw error

      return data.id
    } catch (error) {
      console.error('Queue enqueue error:', error)
      throw new Error('Failed to enqueue job')
    }
  }

  async dequeue(): Promise<any> {
    try {
      if (!supabaseServerClient) {
        throw new Error('Server client not available')
      }

      // Get the highest priority pending job
      const { data: job, error: selectError } = await supabaseServerClient
        .from('sync_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .single()

      if (selectError) {
        if (selectError.code === 'PGRST116') return null // No jobs
        throw selectError
      }

      // Mark as processing
      const { error: updateError } = await supabaseServerClient
        .from('sync_queue')
        .update({ 
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', job.id)

      if (updateError) throw updateError

      return job
    } catch (error) {
      console.error('Queue dequeue error:', error)
      throw new Error('Failed to dequeue job')
    }
  }

  async status(jobId: string): Promise<string> {
    try {
      if (!supabaseServerClient) {
        throw new Error('Server client not available')
      }

      const { data: job, error } = await supabaseServerClient
        .from('sync_queue')
        .select('status')
        .eq('id', jobId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return 'not_found'
        throw error
      }

      return job.status
    } catch (error) {
      console.error('Queue status error:', error)
      return 'error'
    }
  }

  async complete(jobId: string): Promise<void> {
    try {
      if (!supabaseServerClient) {
        throw new Error('Server client not available')
      }

      const { error } = await supabaseServerClient
        .from('sync_queue')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (error) throw error
    } catch (error) {
      console.error('Queue complete error:', error)
      throw new Error('Failed to complete job')
    }
  }

  async fail(jobId: string, errorMessage: string): Promise<void> {
    try {
      if (!supabaseServerClient) {
        throw new Error('Server client not available')
      }

      const { error } = await supabaseServerClient
        .from('sync_queue')
        .update({ 
          status: 'failed',
          error_message: errorMessage,
          processed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (error) throw error
    } catch (error) {
      console.error('Queue fail error:', error)
      throw new Error('Failed to mark job as failed')
    }
  }
}

// Storage service using Supabase Storage
export class SupabaseStorageService implements StorageService {
  private readonly bucketName = 'product-images'

  async upload(file: File, path: string): Promise<string> {
    try {
      if (!supabaseServerClient) {
        throw new Error('Server client not available')
      }

      // Validate file type and size for mobile optimization
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
      }

      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 5MB.')
      }

      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const fullPath = `${path}/${filename}`

      const { data, error } = await supabaseServerClient.storage
        .from(this.bucketName)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Return public URL
      const { data: publicUrl } = supabaseServerClient.storage
        .from(this.bucketName)
        .getPublicUrl(data.path)

      return publicUrl.publicUrl
    } catch (error) {
      console.error('Storage upload error:', error)
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async download(path: string): Promise<Blob> {
    try {
      if (!supabaseServerClient) {
        throw new Error('Server client not available')
      }

      const { data, error } = await supabaseServerClient.storage
        .from(this.bucketName)
        .download(path)

      if (error) throw error

      return data
    } catch (error) {
      console.error('Storage download error:', error)
      throw new Error('Failed to download file')
    }
  }

  async delete(path: string): Promise<void> {
    try {
      if (!supabaseServerClient) {
        throw new Error('Server client not available')
      }

      const { error } = await supabaseServerClient.storage
        .from(this.bucketName)
        .remove([path])

      if (error) throw error
    } catch (error) {
      console.error('Storage delete error:', error)
      throw new Error('Failed to delete file')
    }
  }

  async getPublicUrl(path: string): Promise<string> {
    try {
      if (!supabaseServerClient) {
        throw new Error('Server client not available')
      }

      const { data } = supabaseServerClient.storage
        .from(this.bucketName)
        .getPublicUrl(path)

      return data.publicUrl
    } catch (error) {
      console.error('Storage getPublicUrl error:', error)
      throw new Error('Failed to get public URL')
    }
  }
}

// Encryption service (reusing logic from OpenAI key manager)
export class NodeEncryptionService implements EncryptionService {
  private readonly crypto = require('crypto')
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32
  private readonly ivLength = 16

  private getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required')
    }
    
    return this.crypto.createHmac('sha256', key).digest()
  }

  async encrypt(data: string): Promise<string> {
    try {
      const key = this.getKey()
      const iv = this.crypto.randomBytes(this.ivLength)
      const cipher = this.crypto.createCipheriv(this.algorithm, key, iv)
      
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      // Combine IV + tag + encrypted data
      return iv.toString('hex') + tag.toString('hex') + encrypted
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = this.getKey()
      
      // Extract components
      const iv = Buffer.from(encryptedData.substring(0, this.ivLength * 2), 'hex')
      const tag = Buffer.from(encryptedData.substring(this.ivLength * 2, (this.ivLength + 16) * 2), 'hex')
      const encrypted = encryptedData.substring((this.ivLength + 16) * 2)
      
      const decipher = this.crypto.createDecipheriv(this.algorithm, key, iv)
      decipher.setAuthTag(tag)
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  async hash(data: string): Promise<string> {
    try {
      return this.crypto.createHash('sha256').update(data).digest('hex')
    } catch (error) {
      console.error('Hash error:', error)
      throw new Error('Failed to hash data')
    }
  }
}

// Service factory for dependency injection
export class ServiceFactory {
  private static instance: ServiceFactory
  private services: Map<string, any> = new Map()

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory()
    }
    return ServiceFactory.instance
  }

  getCacheService(): CacheService {
    const key = 'cache'
    if (!this.services.has(key)) {
      this.services.set(key, new MemoryCacheService())
    }
    return this.services.get(key)
  }

  getQueueService(): QueueService {
    const key = 'queue'
    if (!this.services.has(key)) {
      this.services.set(key, new SupabaseQueueService())
    }
    return this.services.get(key)
  }

  getStorageService(): StorageService {
    const key = 'storage'
    if (!this.services.has(key)) {
      this.services.set(key, new SupabaseStorageService())
    }
    return this.services.get(key)
  }

  getEncryptionService(): EncryptionService {
    const key = 'encryption'
    if (!this.services.has(key)) {
      this.services.set(key, new NodeEncryptionService())
    }
    return this.services.get(key)
  }

  clearCache(): void {
    // Properly clean up cache service
    const cacheService = this.services.get('cache')
    if (cacheService && typeof cacheService.destroy === 'function') {
      cacheService.destroy()
    }
    
    this.services.clear()
  }
}

// Export singleton factory
export const serviceFactory = ServiceFactory.getInstance()

// Export individual services for direct use
export const cacheService = serviceFactory.getCacheService()
export const queueService = serviceFactory.getQueueService()
export const storageService = serviceFactory.getStorageService()
export const encryptionService = serviceFactory.getEncryptionService()

// Utility functions for common operations
export const cacheGet = (key: string) => cacheService.get(key)
export const cacheSet = (key: string, value: any, ttl?: number) => cacheService.set(key, value, ttl)
export const enqueuJob = (job: any) => queueService.enqueue(job)
export const uploadFile = (file: File, path: string) => storageService.upload(file, path)