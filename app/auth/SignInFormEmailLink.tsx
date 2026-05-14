import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Form, H2, View, Input, Button, Label, Text } from "tamagui";
import { useToastController } from "@tamagui/toast";

export function SignInFormEmailLink() {
  const [step, setStep] = useState<"signIn" | "linkSent">("signIn");

  return (
    <View 
      padding="$4"
      width="90%"
      maxWidth={400}
      backgroundColor="#262626"
      borderRadius="$4"
    >
      {step === "signIn" ? (
        <>
          <H2 color="#A855F7" marginBottom="$4">Sign in with a link</H2>
          <SignInWithMagicLink handleLinkSent={() => setStep("linkSent")} />
        </>
      ) : (
        <>
          <H2 color="#A855F7" marginBottom="$4">Check your email</H2>
          <Text color="#E5E5E5" marginBottom="$4">A sign-in link has been sent to your email address.</Text>
          <Button 
            backgroundColor="transparent"
            color="#A855F7"
            borderColor="#A855F7"
            borderWidth={1}
            onPress={() => setStep("signIn")}
          >
            Cancel
          </Button>
        </>
      )}
    </View>
  );
}

function SignInWithMagicLink({
  handleLinkSent,
}: {
  handleLinkSent: () => void;
}) {
  const { signIn } = useAuthActions();
  const toast = useToastController();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const handleSubmit = () => {
    setSubmitting(true);
    signIn("resend", { email })
      .then(() => {
        handleLinkSent();
        setSubmitting(false);
      })
      .catch((error) => {
        console.error(error);
        toast.show("Could not send sign-in link");
        setSubmitting(false);
      });
  };
  return (
    <View gap="$4">
      <Text color="#A3A3A3" fontSize="$3">
        Note: Magic links can't be opened in a mobile app, but can allow logging
        in from a browser. OTPs offer a better log in experience for mobile
        apps.
      </Text>
      <Form onSubmit={handleSubmit}>
        <Label color="#E5E5E5" marginBottom="$2">Email</Label>
        <Input
          value={email}
          placeholder="Email"
          autoCapitalize="none"
          onChangeText={setEmail}
          autoComplete="email"
          backgroundColor="#1A1A1A"
          borderColor="#404040"
          color="#FFFFFF"
          placeholderTextColor="#737373"
        />
        <Form.Trigger asChild>
          <Button
            marginTop="$4"
            backgroundColor="#A855F7"
            color="#FFFFFF"
            hoverStyle={{ backgroundColor: "#9333EA" }}
            pressStyle={{ backgroundColor: "#7E22CE" }}
            size="$5"
            disabled={submitting}
            disabledStyle={{ opacity: 0.5 }}
            borderWidth={0}
          >
            Send sign-in link
          </Button>
        </Form.Trigger>
      </Form>
    </View>
  );
}
