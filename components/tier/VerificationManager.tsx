import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

const DOC_TYPES = [
  {
    type: "professional_license",
    title: "Professional Licence",
    description: "Medical or practice licence issued by council",
    pts: 30,
    required: true,
  },
  {
    type: "registration_council",
    title: "Registration Council Document",
    description: "Proof of active registration with regulatory body",
    pts: 25,
    required: true,
  },
  {
    type: "employer_verification",
    title: "Employer / Hospital Verification",
    description: "Letter or badge from current hospital or clinic",
    pts: 20,
    required: false,
  },
  {
    type: "hospital_verification",
    title: "Hospital Appointment Letter",
    description: "Official appointment as consultant or staff",
    pts: 15,
    required: false,
  },
  {
    type: "association_membership",
    title: "Association Membership",
    description: "Membership certificate (e.g. NMA, PSN, NANNM)",
    pts: 10,
    required: false,
  },
  {
    type: "identity",
    title: "Government ID",
    description: "National ID, Passport, or Driver's Licence",
    pts: 10,
    required: true,
  },
];

export function VerificationManager() {
  const verifStatus = useQuery(api.verificationDocs.getMyVerificationStatus);
  const submitDoc = useMutation(api.verificationDocs.submitDocument);

  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [docNameInput, setDocNameInput] = useState("");
  const [docUrlInput, setDocUrlInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (docType: string) => {
    if (!docNameInput.trim() || !docUrlInput.trim()) {
      Alert.alert("Required", "Please provide document title and URL/File reference.");
      return;
    }

    try {
      setLoading(true);
      await submitDoc({
        documentType: docType as any,
        documentName: docNameInput.trim(),
        documentUrl: docUrlInput.trim(),
      });

      Alert.alert("Submitted", "Document uploaded for administrative review.");
      setUploadingType(null);
      setDocNameInput("");
      setDocUrlInput("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit document");
    } finally {
      setLoading(false);
    }
  };

  const docsMap = (verifStatus?.documents || []).reduce((acc: any, d: any) => {
    acc[d.documentType] = d;
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Professional Verification</Text>
          <Text style={styles.subtitle}>
            Verified documents count up to 15% towards your PRS score and unlock the green Verified Badge.
          </Text>
        </View>
      </View>

      <View style={styles.overallBanner}>
        <Ionicons
          name={(verifStatus?.isVerified ? "shield-checkmark" : "alert-circle-outline") as any}
          size={28}
          color={verifStatus?.isVerified ? "#10B981" : "#F59E0B"}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>
            {verifStatus?.isVerified ? "Verified Professional" : "Verification Pending"}
          </Text>
          <Text style={styles.bannerSub}>
            {verifStatus?.isVerified
              ? "Your professional licence is verified. Your profile displays the green checkmark."
              : "Upload your professional licence to obtain the verified badge."}
          </Text>
        </View>
      </View>

      {DOC_TYPES.map((dt) => {
        const submitted = docsMap[dt.type];
        const isEditing = uploadingType === dt.type;

        return (
          <View key={dt.type} style={styles.docCard}>
            <View style={styles.docRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.docTitle}>{dt.title}</Text>
                  {dt.required && <Text style={styles.requiredBadge}>Required</Text>}
                </View>
                <Text style={styles.docDesc}>{dt.description}</Text>
              </View>

              <View style={styles.rightColumn}>
                <Text style={styles.ptsText}>+{dt.pts} pts</Text>

                {submitted ? (
                  <View
                    style={[
                      styles.statusPill,
                      submitted.status === "approved"
                        ? styles.approvedPill
                        : submitted.status === "rejected"
                        ? styles.rejectedPill
                        : styles.pendingPill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            submitted.status === "approved"
                              ? "#10B981"
                              : submitted.status === "rejected"
                              ? "#EF4444"
                              : "#F59E0B",
                        },
                      ]}
                    >
                      {submitted.status.toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => {
                      setUploadingType(dt.type);
                      setDocNameInput(dt.title);
                      setDocUrlInput("");
                    }}
                  >
                    <Text style={styles.uploadBtnText}>Submit</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {submitted?.rejectionReason ? (
              <Text style={styles.rejectionText}>
                Reason for rejection: {submitted.rejectionReason}
              </Text>
            ) : null}

            {isEditing && (
              <View style={styles.inlineForm}>
                <Text style={styles.label}>Document Name / Number</Text>
                <TextInput
                  style={styles.input}
                  value={docNameInput}
                  onChangeText={setDocNameInput}
                  placeholder="e.g. Licence #MDCN/2020/1234"
                  placeholderTextColor="#6B7280"
                />

                <Text style={styles.label}>Document Storage URL / File ID</Text>
                <TextInput
                  style={styles.input}
                  value={docUrlInput}
                  onChangeText={setDocUrlInput}
                  placeholder="Paste storage URL or file reference"
                  placeholderTextColor="#6B7280"
                />

                <View style={styles.inlineActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setUploadingType(null)}
                    disabled={loading}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => handleSubmit(dt.type)}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitText}>Confirm Upload</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typeScale.titleMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  subtitle: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  overallBanner: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bannerTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bannerSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  docCard: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.sm,
  },
  docRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  docTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  requiredBadge: {
    ...typeScale.labelSmall,
    color: "#EF4444",
    backgroundColor: "#EF444415",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  docDesc: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  rightColumn: {
    alignItems: "flex-end",
    gap: 4,
  },
  ptsText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "700",
  },
  uploadBtn: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  uploadBtnText: {
    ...typeScale.labelSmall,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  approvedPill: {
    backgroundColor: "#10B98115",
  },
  pendingPill: {
    backgroundColor: "#F59E0B15",
  },
  rejectedPill: {
    backgroundColor: "#EF444415",
  },
  statusPillText: {
    ...typeScale.labelSmall,
    fontWeight: "700",
  },
  rejectionText: {
    ...typeScale.bodySmall,
    color: "#EF4444",
    marginTop: spacing.xs,
  },
  inlineForm: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#262945",
  },
  label: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#0F101D",
    color: "#FFFFFF",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.xs,
    ...typeScale.bodyMedium,
  },
  inlineActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#374151",
  },
  cancelText: {
    ...typeScale.labelMedium,
    color: "#9CA3AF",
  },
  submitBtn: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  submitText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
