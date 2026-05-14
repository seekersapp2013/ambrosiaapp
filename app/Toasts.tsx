import {
  Toast,
  ToastProvider,
  ToastViewport,
  useToastState,
} from "@tamagui/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Toasts({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <SafeToastViewport />
      <CurrentToast />
    </ToastProvider>
  );
}

const SafeToastViewport = () => {
  const { left, top, right } = useSafeAreaInsets();
  return (
    <ToastViewport
      flexDirection="column-reverse"
      top={top + 40}
      left={left}
      right={right}
    />
  );
};

const CurrentToast = () => {
  const currentToast = useToastState();

  if (!currentToast || currentToast.isHandledNatively) return null;
  return (
    <Toast
      key={currentToast.id}
      duration={currentToast.duration}
      enterStyle={{ opacity: 0, scale: 0.9, y: -25 }}
      exitStyle={{ opacity: 0, scale: 0.95, y: -20 }}
      y={0}
      opacity={1}
      scale={1}
      animation="quick"
      viewportName={currentToast.viewportName}
      backgroundColor="#171717"
      borderWidth={1}
      borderColor="#262626"
      borderRadius={12}
      paddingVertical="$3"
      paddingHorizontal="$4"
    >
      <Toast.Title 
        color="#FFFFFF"
        fontSize={15}
        fontWeight="600"
      >
        {currentToast.title}
      </Toast.Title>
    </Toast>
  );
};
