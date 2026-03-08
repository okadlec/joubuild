import { useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import PdfRendererView from 'react-native-pdf-renderer';
import { AnnotationOverlay } from './annotation-overlay';

interface ZoomablePlanViewerProps {
  uri: string;
  pdfWidth: number;
  pdfHeight: number;
  annotations: any[];
  selectedId?: string | null;
  isMoving?: boolean;
  onShapePress?: (annotationId: string) => void;
  onDeselect?: () => void;
  onMoveEnd?: (annotationId: string, deltaXPdf: number, deltaYPdf: number) => void;
  maxZoom?: number;
}

export function ZoomablePlanViewer({
  uri,
  pdfWidth,
  pdfHeight,
  annotations,
  selectedId,
  isMoving,
  onShapePress,
  onDeselect,
  onMoveEnd,
  maxZoom = 5,
}: ZoomablePlanViewerProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const renderedWidth = containerSize.width;
  const renderedHeight =
    pdfWidth > 0
      ? containerSize.width * (pdfHeight / pdfWidth)
      : containerSize.height;

  const clampTranslate = (
    tx: number,
    ty: number,
    s: number,
  ) => {
    'worklet';
    const scaledW = renderedWidth * s;
    const scaledH = renderedHeight * s;
    const maxTx = Math.max(0, (scaledW - containerSize.width) / 2);
    const maxTy = Math.max(0, (scaledH - containerSize.height) / 2);
    return {
      x: Math.min(maxTx, Math.max(-maxTx, tx)),
      y: Math.min(maxTy, Math.max(-maxTy, ty)),
    };
  };

  const pinchGesture = Gesture.Pinch()
    .enabled(!isMoving)
    .onStart((e) => {
      'worklet';
      focalX.value = e.focalX;
      focalY.value = e.focalY;
    })
    .onUpdate((e) => {
      'worklet';
      const newScale = Math.min(maxZoom, Math.max(1, savedScale.value * e.scale));
      const fx = focalX.value - containerSize.width / 2;
      const fy = focalY.value - containerSize.height / 2;
      const ds = newScale / savedScale.value;
      const newTx = savedTranslateX.value * ds + fx * (1 - ds);
      const newTy = savedTranslateY.value * ds + fy * (1 - ds);

      scale.value = newScale;
      const clamped = clampTranslate(newTx, newTy, newScale);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(!isMoving)
    .minPointers(1)
    .onUpdate((e) => {
      'worklet';
      if (scale.value <= 1) return;
      const newTx = savedTranslateX.value + e.translationX;
      const newTy = savedTranslateY.value + e.translationY;
      const clamped = clampTranslate(newTx, newTy, scale.value);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      'worklet';
      if (scale.value > 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const targetScale = Math.min(3, maxZoom);
        const fx = e.x - containerSize.width / 2;
        const fy = e.y - containerSize.height / 2;
        const newTx = fx * (1 - targetScale);
        const newTy = fy * (1 - targetScale);
        const clamped = clampTranslate(newTx, newTy, targetScale);
        scale.value = withSpring(targetScale);
        translateX.value = withSpring(clamped.x);
        translateY.value = withSpring(clamped.y);
        savedScale.value = targetScale;
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTapGesture)
    .onEnd(() => {
      'worklet';
      if (onDeselect) {
        runOnJS(onDeselect)();
      }
    });

  const composed = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const pdfSource = uri.startsWith('file://') ? uri : `file://${uri}`;

  if (!containerSize.width) {
    return <View style={{ flex: 1 }} onLayout={onLayout} />;
  }

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onLayout}>
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[
            {
              width: renderedWidth,
              height: renderedHeight,
              alignSelf: 'center',
            },
            animatedStyle,
          ]}
        >
          <View style={{ width: renderedWidth, height: renderedHeight }} pointerEvents="none">
            <PdfRendererView
              style={{ flex: 1 }}
              source={pdfSource}
              singlePage
              maxZoom={1}
            />
          </View>
          <AnnotationOverlay
            annotations={annotations}
            pdfWidth={pdfWidth}
            pdfHeight={pdfHeight}
            renderedWidth={renderedWidth}
            renderedHeight={renderedHeight}
            selectedId={selectedId}
            isMoving={isMoving}
            onShapePress={onShapePress}
            onMoveEnd={onMoveEnd}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
