// Simple compression using built-in compression
export class CompressionService {
  static async compress(text: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Use CompressionStream if available (modern browsers)
    if ('CompressionStream' in window) {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      const reader = cs.readable.getReader();
      
      writer.write(data);
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    }
    
    // Fallback: simple string compression
    return this.simpleCompress(text);
  }

  static async decompress(compressedData: Uint8Array): Promise<string> {
    // Use DecompressionStream if available
    if ('DecompressionStream' in window) {
      try {
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        
        writer.write(compressedData);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        const decoder = new TextDecoder();
        return decoder.decode(result);
      } catch (error) {
        // Fallback to simple decompression
        return this.simpleDecompress(compressedData);
      }
    }
    
    return this.simpleDecompress(compressedData);
  }

  private static simpleCompress(text: string): Uint8Array {
    // Simple compression: remove repeated spaces and encode
    const compressed = text.replace(/\s+/g, ' ').trim();
    return new TextEncoder().encode(compressed);
  }

  private static simpleDecompress(data: Uint8Array): string {
    return new TextDecoder().decode(data);
  }
}
