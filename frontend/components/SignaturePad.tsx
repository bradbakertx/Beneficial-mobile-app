import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

interface SignaturePadProps {
  onEnd: (signature: string) => void;
  onClear?: () => void;
}

export interface SignaturePadRef {
  getSignature: () => void;
  clearSignature: () => void;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({ onEnd, onClear }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nativeSignatureRef = useRef<any>(null);
  const isDrawing = useRef(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const hasDrawn = useRef(false);
  const [nativeSignature, setNativeSignature] = useState<string | null>(null);

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
  };

  const getSignature = () => {
    console.log('getSignature called, hasDrawn:', hasDrawn.current);
    if (canvasRef.current && hasDrawn.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      console.log('Signature data URL length:', dataUrl.length);
      onEnd(dataUrl);
    } else {
      console.log('No signature to get');
    }
  };

  const clearSignature = () => {
    if (contextRef.current && canvasRef.current) {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      hasDrawn.current = false;
      if (onClear) onClear();
    }
  };

  // For native: handle signature from react-native-signature-canvas
  const handleNativeOK = (signature: string) => {
    console.log('Native signature captured:', signature.substring(0, 50) + '...');
    // Only call onEnd if we haven't already processed this signature
    if (signature && signature !== nativeSignature) {
      setNativeSignature(signature);
      onEnd(signature);
    }
  };

  const handleNativeEnd = () => {
    console.log('Native signature end - requesting signature from canvas');
    // Request signature from the canvas
    if (nativeSignatureRef.current && !nativeSignature) {
      nativeSignatureRef.current.readSignature();
    } else if (nativeSignature) {
      // If we already have a signature, just call onEnd
      onEnd(nativeSignature);
    }
  };

  const clearNativeSignature = () => {
    if (nativeSignatureRef.current) {
      nativeSignatureRef.current.clearSignature();
      setNativeSignature(null);
      if (onClear) onClear();
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getSignature: Platform.OS === 'web' ? getSignature : handleNativeEnd,
    clearSignature: Platform.OS === 'web' ? clearSignature : clearNativeSignature
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

  // For native platforms (Android/iOS), use react-native-signature-canvas
  return (
    <View style={styles.nativeContainer}>
      <SignatureCanvas
        ref={nativeSignatureRef}
        onOK={handleNativeOK}
        onEmpty={() => console.log('Native signature is empty')}
        descriptionText="Sign above"
        clearText="Clear"
        confirmText="Done"
        webStyle={`
          .m-signature-pad {
            box-shadow: none;
            border: 2px solid #E5E5EA;
            border-radius: 8px;
          }
          .m-signature-pad--body {
            border: none;
          }
          .m-signature-pad--footer {
            display: none;
          }
        `}
        style={styles.signatureCanvas}
      />
    </View>
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeContainer: {
    width: '100%',
    height: 250,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  signatureCanvas: {
    flex: 1,
    backgroundColor: '#FFF',
  },
});
