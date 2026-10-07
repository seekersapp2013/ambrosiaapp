import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface ContentItem {
  id: string;
  title: string;
  type: "article" | "reel" | "course";
}

interface AskProviderModalProps {
  visible: boolean;
  providerId: string;
  providerName: string;
  articles?: Array<{ id: string; title: string }>;
  reels?: Array<{ id: string; title: string }>;
  courses?: Array<{ id: string; title: string }>;
  onClose: () => void;
}

export function AskProviderModal({
  visible,
  providerId,
  providerName,
  articles = [],
  reels = [],
  courses = [],
  onClose,
}: AskProviderModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"choice" | "content_select" | "direct_question">("choice");
  const [questionText, setQuestionText] = useState("");
  const [loading, setLoading] = useState(false);

  const startConsultation = useMutation(api.consultations.startConsultation);

  const allContentItems: ContentItem[] = [
    ...articles.map((a) => ({ id: a.id, title: a.title, type: "article" as const })),
    ...reels.map((r) => ({ id: r.id, title: r.title, type: "reel" as const })),
    ...courses.map((c) => ({ id: c.id, title: c.title, type: "course" as const })),
  ];

  const handleSelectContentItem = (item: ContentItem) => {
    onClose();
    if (item.type === "article") {
      router.push({
        pathname: "/(tabs)/article-viewer",
        params: { id: item.id, openAsk: "true" },
      } as any);
    } else if (item.type === "reel") {
      router.push({
        pathname: "/(tabs)/reel-viewer",
        params: { id: item.id, openAsk: "true" },
      } as any);
    } else if (item.type === "course") {
      router.push({
        pathname: "/(tabs)/course-viewer",
        params: { id: item.id, openAsk: "true" },
      } as any);
    }
  };

  const handleSendDirectQuestion = async () => {
    if (!questionText.trim()) {
      Alert.alert("Required", "Please type your question before sending.");
      return;
    }

    try {
      setLoading(true);
      const result = await startConsultation({
        expertId: providerId as any,
      } as any);

      if (result && result.circleId) {
        onClose();
        setQuestionText("");
        setStep("choice");

        router.push({
          pathname: "/(tabs)/circle-chat",
          params: {
            circleId: result.circleId,
            initialQuestion: questionText.trim(),
          },
        } as any);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send question to provider.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setStep("choice");
    setQuestionText("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCloseModal}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="chatbubbles" size={22} color="#00BFA6" />
              <Text style={styles.headerTitle}>Ask {providerName}</Text>
            </View>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* STEP 1: Choice Screen */}
          {step === "choice" && (
            <View style={styles.choiceContainer}>
              <Text style={styles.choiceSubtitle}>
                How would you like to direct your question to {providerName}?
              </Text>

              {/* Option A: Attach to Content */}
              <TouchableOpacity
                style={styles.choiceCard}
                onPress={() => setStep("content_select")}
                activeOpacity={0.8}
              >
                <View style={[styles.choiceIconBg, { backgroundColor: "#2196F320" }]}>
                  <Ionicons name="document-text" size={24} color="#2196F3" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceCardTitle}>Attach to Content</Text>
                  <Text style={styles.choiceCardSub}>
                    Ask a question directly on an article, pulse reel, or course created by this provider.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>

              {/* Option B: Direct Question */}
              <TouchableOpacity
                style={styles.choiceCard}
                onPress={() => setStep("direct_question")}
                activeOpacity={0.8}
              >
                <View style={[styles.choiceIconBg, { backgroundColor: "#00BFA620" }]}>
                  <Ionicons name="paper-plane" size={24} color="#00BFA6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceCardTitle}>Start Direct Text Question</Text>
                  <Text style={styles.choiceCardSub}>
                    Type a custom health inquiry directly to {providerName} in a consultation chat.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2A: Content Selection */}
          {step === "content_select" && (
            <View style={styles.stepContainer}>
              <TouchableOpacity style={styles.backLink} onPress={() => setStep("choice")}>
                <Ionicons name="arrow-back" size={18} color="#00BFA6" />
                <Text style={styles.backLinkText}>Back to options</Text>
              </TouchableOpacity>

              <Text style={styles.stepTitle}>Select Content to Attach Question</Text>

              {allContentItems.length > 0 ? (
                <ScrollView style={styles.contentList}>
                  {allContentItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.contentRow}
                      onPress={() => handleSelectContentItem(item)}
                    >
                      <Ionicons
                        name={
                          item.type === "article"
                            ? "newspaper-outline"
                            : item.type === "reel"
                            ? "play-circle-outline"
                            : "school-outline"
                        }
                        size={20}
                        color="#00BFA6"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contentItemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.contentTypeTag}>{item.type.toUpperCase()}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noContentBox}>
                  <Text style={styles.noContentText}>
                    No public articles, reels, or courses found for this provider yet.
                  </Text>
                  <TouchableOpacity style={styles.directQuestionAltBtn} onPress={() => setStep("direct_question")}>
                    <Text style={styles.directQuestionAltText}>Ask Direct Question Instead</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* STEP 2B: Direct Question Text Area */}
          {step === "direct_question" && (
            <View style={styles.stepContainer}>
              <TouchableOpacity style={styles.backLink} onPress={() => setStep("choice")}>
                <Ionicons name="arrow-back" size={18} color="#00BFA6" />
                <Text style={styles.backLinkText}>Back to options</Text>
              </TouchableOpacity>

              <Text style={styles.stepTitle}>Ask {providerName} Directly</Text>
              <Text style={styles.stepSub}>
                Your question will initiate a private consultation inquiry.
              </Text>

              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={5}
                placeholder={`Describe your question or symptom for ${providerName}...`}
                placeholderTextColor="#6B7280"
                value={questionText}
                onChangeText={setQuestionText}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSendDirectQuestion}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Submit Question to {providerName}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#16182B",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#262945",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  choiceContainer: {
    paddingBottom: spacing.md,
  },
  choiceSubtitle: {
    ...typeScale.bodyMedium,
    color: "#9CA3AF",
    marginBottom: spacing.md,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F101D",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  choiceIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  choiceCardTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  choiceCardSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  stepContainer: {
    paddingBottom: spacing.md,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.xs,
  },
  backLinkText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "600",
  },
  stepTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 4,
  },
  stepSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginBottom: spacing.md,
  },
  contentList: {
    maxHeight: 240,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#0F101D",
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: "#262945",
  },
  contentItemTitle: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
  },
  contentTypeTag: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontSize: 10,
    marginTop: 2,
  },
  noContentBox: {
    padding: spacing.md,
    alignItems: "center",
  },
  noContentText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  directQuestionAltBtn: {
    backgroundColor: "#00BFA620",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#00BFA6",
  },
  directQuestionAltText: {
    ...typeScale.labelMedium,
    color: "#00BFA6",
    fontWeight: "700",
  },
  textArea: {
    backgroundColor: "#0F101D",
    color: "#FFFFFF",
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
    minHeight: 110,
    ...typeScale.bodyMedium,
    marginBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: "#00BFA6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  submitBtnText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
