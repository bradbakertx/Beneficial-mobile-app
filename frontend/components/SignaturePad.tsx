import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface SignaturePadProps {
  onEnd: (signature: string) => void;
  onClear?: () => void;
}

export default function SignaturePad({ onEnd, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const hasDrawn = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;
      }
    }
  }, []);

  const startDrawing = (e: any) => {
    if (!contextRef.current || !canvasRef.current) return;
    
    isDrawing.current = true;
    hasDrawn.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing.current || !contextRef.current || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    // Only call onEnd when user explicitly clicks "Done", not on every stroke
    // The signature is captured when the component's parent requests it
  };

  const getSignature = () => {
    if (canvasRef.current && hasDrawn.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onEnd(dataUrl);
    }
  };

  const clearSignature = () => {
    if (contextRef.current && canvasRef.current) {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      hasDrawn.current = false;
      if (onClear) onClear();
    }
  };

  // Expose methods to parent via ref
  React.useImperativeHandle((ref: any) => ref, () => ({
    getSignature,
    clearSignature
  }));

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          style={{
            border: '2px solid #E5E5EA',
            borderRadius: '8px',
            cursor: 'crosshair',
            touchAction: 'none',
            backgroundColor: '#FFF'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e: any) => {
            const touch = e.touches[0];
            startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
          }}
          onTouchMove={(e: any) => {
            const touch = e.touches[0];
            draw({ clientX: touch.clientX, clientY: touch.clientY });
          }}
          onTouchEnd={stopDrawing}
        />
      </View>
    );
  }

  // For native platforms, we'd use react-native-signature-canvas
  // For now, return null on native (implement later if needed)
  return null;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
