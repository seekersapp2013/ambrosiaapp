import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useColors } from "@/hooks/useColors";
import { AppBackground } from "@/components/AppBackground";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

import providerKYCConfig from "@/config/providerKYC.json";

type TabKey = "automation" | "kyc_scores" | "content" | "engagement" | "sessions" | "tenure";

export default function AdminTierSettingsScreen() {
  const router = useRouter();
  const C = useColors();

  // Queries
  const config = useQuery((api as any).tierConfig.getTierConfig);
  const savedRules = useQuery((api as any).providerExp.getExpRewardRules);
  const kycScores = useQuery((api as any).tierAdmin.getKYCScoringRules);

  // Mutations
  const updateConfigMut = useMutation((api as any).tierConfig.updateTierConfig);
  const updateRulesMut = useMutation((api as any).providerExp.updateExpRewardRules);
  const updateKycScoresMut = useMutation((api as any).tierAdmin.updateKYCScoringRules);

  const [activeTab, setActiveTab] = useState<TabKey>("automation");
  const [saving, setSaving] = useState(false);

  // Automation & AI state
  const [autoPromote, setAutoPromote] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);

  // Flattened KYC Fields list from schema
  const allKycFields = React.useMemo(() => {
    const fields: Array<{
      id: string;
      label: string;
      defaultPoints: number;
      category: string;
      stepTitle: string;
    }> = [];
    for (const step of providerKYCConfig.steps || []) {
      for (const field of step.fields || []) {
        fields.push({
          id: field.id,
          label: field.label || field.id,
          defaultPoints: (field as any).scorePoints ?? 5,
          category: (field as any).scoreCategory || "qualifications",
          stepTitle: step.title,
        });
      }
    }
    return fields;
  }, []);

  // Draft state for dynamic KYC field score points
  const [kycDraftScores, setKycDraftScores] = useState<Record<string, string>>({});

  // EXP Rules draft state
  const [artExp, setArtExp] = useState("50");
  const [pulseExp, setPulseExp] = useState("30");
  const [genCircleExp, setGenCircleExp] = useState("40");
  const [consultCircleExp, setConsultCircleExp] = useState("60");
  const [refCircleExp, setRefCircleExp] = useState("50");

  const [clapExp, setClapExp] = useState("2");
  const [likeExp, setLikeExp] = useState("3");
  const [commentExp, setCommentExp] = useState("5");
  const [shareExp, setShareExp] = useState("10");

  const [dailySigninExp, setDailySigninExp] = useState("10");

  const [sessionBaseExp, setSessionBaseExp] = useState("30");
  const [star5Exp, setStar5Exp] = useState("50");
  const [star4Exp, setStar4Exp] = useState("35");
  const [star3Exp, setStar3Exp] = useState("20");
  const [star2Exp, setStar2Exp] = useState("5");
  const [star1Exp, setStar1Exp] = useState("0");

  const [tenureYearExp, setTenureYearExp] = useState("500");

  const [createCourseExp, setCreateCourseExp] = useState("100");
  const [enrollmentExp, setEnrollmentExp] = useState("15");

  // Hydrate Automation Config
  useEffect(() => {
    if (config) {
      setAutoPromote(config.autoPromoteOnExpAward ?? true);
      setAiEnabled(config.aiEvaluationEnabled ?? false);
    }
  }, [config]);

  // Hydrate KYC Field Scores
  useEffect(() => {
    const initialDrafts: Record<string, string> = {};
    for (const f of allKycFields) {
      const savedVal = kycScores?.[f.id]?.points ?? kycScores?.[f.id];
      initialDrafts[f.id] = String(savedVal !== undefined ? savedVal : f.defaultPoints);
    }
    setKycDraftScores(initialDrafts);
  }, [kycScores, allKycFields]);

  // Hydrate EXP Reward Rules
  useEffect(() => {
    if (savedRules) {
      if (savedRules.content) {
        setArtExp(String(savedRules.content.create_article ?? 50));
        setPulseExp(String(savedRules.content.create_pulse ?? 30));
        setGenCircleExp(String(savedRules.content.create_general_circle ?? 40));
        setConsultCircleExp(String(savedRules.content.create_consultation_circle ?? 60));
        setRefCircleExp(String(savedRules.content.create_referral_circle ?? 50));
      }
      if (savedRules.engagement) {
        setClapExp(String(savedRules.engagement.clap_per_item ?? 2));
        setLikeExp(String(savedRules.engagement.like_per_item ?? 3));
        setCommentExp(String(savedRules.engagement.comment_per_item ?? 5));
        setShareExp(String(savedRules.engagement.share_per_item ?? 10));
      }
      if (savedRules.activity) {
        setDailySigninExp(String(savedRules.activity.daily_signin ?? 10));
      }
      if (savedRules.sessions) {
        setSessionBaseExp(String(savedRules.sessions.completed_session_base ?? 30));
        setStar5Exp(String(savedRules.sessions.rating_5_star_bonus ?? 50));
        setStar4Exp(String(savedRules.sessions.rating_4_star_bonus ?? 35));
        setStar3Exp(String(savedRules.sessions.rating_3_star_bonus ?? 20));
        setStar2Exp(String(savedRules.sessions.rating_2_star_bonus ?? 5));
        setStar1Exp(String(savedRules.sessions.rating_1_star_bonus ?? 0));
      }
      if (savedRules.tenure) {
        setTenureYearExp(String(savedRules.tenure.exp_per_year ?? 500));
      }
      if (savedRules.learn) {
        setCreateCourseExp(String(savedRules.learn.create_course ?? 100));
        setEnrollmentExp(String(savedRules.learn.student_enrollment ?? 15));
      }
    }
  }, [savedRules]);

  const handleSaveAll = async () => {
    try {
      setSaving(true);

      // Save Tier Automation Config
      await updateConfigMut({
        config: {
          ...config,
          autoPromoteOnExpAward: autoPromote,
          aiEvaluationEnabled: aiEnabled,
        },
      });

      // Save KYC Field Scoring Rules
      const fieldScoresPayload: Record<string, { points: number; category: string; label: string }> = {};
      for (const f of allKycFields) {
        const raw = kycDraftScores[f.id];
        const parsed = parseInt(raw, 10);
        fieldScoresPayload[f.id] = {
          points: isNaN(parsed) ? f.defaultPoints : Math.max(0, parsed),
          category: f.category,
          label: f.label,
        };
      }
      await updateKycScoresMut({ fieldScores: fieldScoresPayload });

      // Save EXP Reward Rules
      await updateRulesMut({
        rules: {
          content: {
            create_article: parseInt(artExp, 10) || 50,
            create_pulse: parseInt(pulseExp, 10) || 30,
            create_general_circle: parseInt(genCircleExp, 10) || 40,
            create_consultation_circle: parseInt(consultCircleExp, 10) || 60,
            create_referral_circle: parseInt(refCircleExp, 10) || 50,
          },
          engagement: {
            clap_per_item: parseInt(clapExp, 10) || 2,
            like_per_item: parseInt(likeExp, 10) || 3,
            comment_per_item: parseInt(commentExp, 10) || 5,
            share_per_item: parseInt(shareExp, 10) || 10,
          },
          activity: {
            daily_signin: parseInt(dailySigninExp, 10) || 10,
          },
          sessions: {
            completed_session_base: parseInt(sessionBaseExp, 10) || 30,
            rating_5_star_bonus: parseInt(star5Exp, 10) || 50,
            rating_4_star_bonus: parseInt(star4Exp, 10) || 35,
            rating_3_star_bonus: parseInt(star3Exp, 10) || 20,
            rating_2_star_bonus: parseInt(star2Exp, 10) || 5,
            rating_1_star_bonus: parseInt(star1Exp, 10) || 0,
          },
          tenure: {
            exp_per_year: parseInt(tenureYearExp, 10) || 500,
          },
          learn: {
            create_course: parseInt(createCourseExp, 10) || 100,
            student_enrollment: parseInt(enrollmentExp, 10) || 15,
          },
        },
      });

      Alert.alert("Success", "Tier configuration, KYC scores, and EXP rules saved successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (config === undefined || savedRules === undefined || kycScores === undefined) {
    return (
      <AppBackground>
        <ScreenHeader title="Tier Settings & Rules" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.actionPrimary} />
          <Text style={[styles.loadingText, { color: C.textMuted }]}>
            Loading settings & rules...
          </Text>
        </View>
      </AppBackground>
    );
  }

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "automation", label: "Automation & Tiers", icon: "settings-outline" },
    { key: "kyc_scores", label: "KYC Scoring", icon: "document-text-outline" },
    { key: "content", label: "Content EXP", icon: "create-outline" },
    { key: "engagement", label: "Engagement", icon: "heart-outline" },
    { key: "sessions", label: "Activity & Sessions", icon: "calendar-outline" },
    { key: "tenure", label: "Tenure & Learn", icon: "school-outline" },
  ];

  return (
    <AppBackground>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <ScreenHeader
          title="Tier Settings & Rules"
          onBack={() => router.back()}
          trailing={
            <TouchableOpacity
              style={[styles.topSaveBtn, { backgroundColor: C.actionPrimary }]}
              onPress={handleSaveAll}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.topSaveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          }
        />

        {/* Horizontal Pill Tabs */}
        <View style={[styles.tabBarContainer, { backgroundColor: C.bgSurface, borderBottomColor: C.borderSubtle }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarScroll}
          >
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.tabItem,
                    {
                      backgroundColor: active
                        ? C.isDark ? "rgba(198,34,41,0.18)" : "rgba(198,34,41,0.12)"
                        : C.bgElevated,
                      borderColor: active ? C.actionPrimary : C.borderSubtle,
                    },
                  ]}
                  onPress={() => setActiveTab(t.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={t.icon}
                    size={15}
                    color={active ? C.actionPrimary : C.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: active ? C.actionPrimary : C.textMuted },
                      active && styles.tabLabelActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TAB 1: Automation & PRS Summary */}
          {activeTab === "automation" && (
            <>
              <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="hardware-chip-outline" size={20} color={C.actionPrimary} />
                  <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Automation Settings</Text>
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchTextGroup}>
                    <Text style={[styles.switchLabel, { color: C.textPrimary }]}>Auto-Promote on EXP Award</Text>
                    <Text style={[styles.switchDesc, { color: C.textMuted }]}>
                      Instantly re-evaluate and upgrade tier status whenever EXP is earned.
                    </Text>
                  </View>
                  <Switch
                    value={autoPromote}
                    onValueChange={setAutoPromote}
                    trackColor={{ false: C.isDark ? C.bgElevated : C.bgInput, true: C.actionPrimary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.divider, { backgroundColor: C.borderSubtle }]} />

                <View style={styles.switchRow}>
                  <View style={styles.switchTextGroup}>
                    <Text style={[styles.switchLabel, { color: C.textPrimary }]}>AI Tier Evaluation Engine</Text>
                    <Text style={[styles.switchDesc, { color: C.textMuted }]}>
                      Use Amazon Nova AI model for automated provider credentialing scoring.
                    </Text>
                  </View>
                  <Switch
                    value={aiEnabled}
                    onValueChange={setAiEnabled}
                    trackColor={{ false: C.isDark ? C.bgElevated : C.bgInput, true: C.actionPrimary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
                  <Text style={[styles.cardTitle, { color: C.textPrimary }]}>PRS Threshold Hierarchy</Text>
                </View>
                <Text style={[styles.cardSub, { color: C.textMuted }]}>Required score ranges for professional tiers:</Text>

                <View style={styles.thresholdGrid}>
                  <View style={[styles.thresholdRow, { backgroundColor: C.bgElevated }]}>
                    <View style={styles.tierNameRow}>
                      <Ionicons name="star" size={14} color="#3B82F6" />
                      <Text style={[styles.tierName, { color: "#3B82F6" }]}>Sapphire</Text>
                    </View>
                    <Text style={[styles.thresholdRange, { color: C.textSecondary }]}>0 - 29 PRS</Text>
                  </View>
                  <View style={[styles.thresholdRow, { backgroundColor: C.bgElevated }]}>
                    <View style={styles.tierNameRow}>
                      <Ionicons name="star" size={14} color="#9CA3AF" />
                      <Text style={[styles.tierName, { color: "#9CA3AF" }]}>Silver</Text>
                    </View>
                    <Text style={[styles.thresholdRange, { color: C.textSecondary }]}>30 - 54 PRS</Text>
                  </View>
                  <View style={[styles.thresholdRow, { backgroundColor: C.bgElevated }]}>
                    <View style={styles.tierNameRow}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={[styles.tierName, { color: "#F59E0B" }]}>Gold</Text>
                    </View>
                    <Text style={[styles.thresholdRange, { color: C.textSecondary }]}>55 - 74 PRS</Text>
                  </View>
                  <View style={[styles.thresholdRow, { backgroundColor: C.bgElevated }]}>
                    <View style={styles.tierNameRow}>
                      <Ionicons name="star" size={14} color="#E5E4E2" />
                      <Text style={[styles.tierName, { color: "#E5E4E2" }]}>Platinum</Text>
                    </View>
                    <Text style={[styles.thresholdRange, { color: C.textSecondary }]}>75 - 89 PRS</Text>
                  </View>
                  <View style={[styles.thresholdRow, { backgroundColor: C.bgElevated }]}>
                    <View style={styles.tierNameRow}>
                      <Ionicons name="star" size={14} color="#38BDF8" />
                      <Text style={[styles.tierName, { color: "#38BDF8" }]}>Diamond</Text>
                    </View>
                    <Text style={[styles.thresholdRange, { color: C.textSecondary }]}>90+ PRS</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* TAB: KYC Scoring Rules */}
          {activeTab === "kyc_scores" && (
            <>
              <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="document-text-outline" size={20} color={C.actionPrimary} />
                  <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Dynamic KYC Scoring Rules</Text>
                </View>
                <Text style={[styles.cardSub, { color: C.textMuted }]}>
                  Configure the score points awarded to providers when they fill in each KYC credential item. These points dynamically flow into the PRS deterministic score and AI evaluation.
                </Text>
              </View>

              {allKycFields.map((field) => {
                const currentScore = kycDraftScores[field.id] ?? String(field.defaultPoints);
                const categoryColorMap: Record<string, string> = {
                  qualifications: "#8B5CF6",
                  experience: "#3B82F6",
                  verification: "#10B981",
                  referralPerformance: "#F59E0B",
                  patientExperience: "#EC4899",
                  knowledgeContributions: "#06B6D4",
                  communityImpact: "#6366F1",
                  bonus: "#F97316",
                };
                const catColor = categoryColorMap[field.category] || C.actionPrimary;

                return (
                  <View
                    key={field.id}
                    style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle, marginBottom: spacing.xs }]}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.switchLabel, { color: C.textPrimary }]}>{field.label}</Text>
                        <Text style={[styles.switchDesc, { color: C.textMuted, marginTop: 2 }]}>
                          Field ID: <Text style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: C.textSecondary }}>{field.id}</Text> • Step: {field.stepTitle}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: `${catColor}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1, borderColor: catColor }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: catColor, textTransform: "capitalize" }}>
                          {field.category}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fieldLabel, { color: C.textSecondary, marginTop: 0 }]}>Score Points Awarded</Text>
                        <Text style={{ fontSize: 11, color: C.textMuted }}>Default in schema: {field.defaultPoints} pts</Text>
                      </View>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            width: 80,
                            textAlign: "center",
                            backgroundColor: C.bgInput,
                            color: C.textPrimary,
                            borderColor: C.borderSubtle,
                            fontWeight: "700",
                          },
                        ]}
                        keyboardType="number-pad"
                        value={currentScore}
                        onChangeText={(val) => setKycDraftScores((prev) => ({ ...prev, [field.id]: val }))}
                        placeholder={String(field.defaultPoints)}
                        placeholderTextColor={C.textMuted}
                      />
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* TAB 2: Content Creation EXP */}
          {activeTab === "content" && (
            <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="create-outline" size={20} color={C.actionPrimary} />
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Content Creation EXP Rules</Text>
              </View>
              <Text style={[styles.cardSub, { color: C.textMuted }]}>EXP awarded when providers create or publish content:</Text>

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Publish Article EXP</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                keyboardType="number-pad"
                value={artExp}
                onChangeText={setArtExp}
                placeholder="50"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Publish Pulse (Reel/Post) EXP</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                keyboardType="number-pad"
                value={pulseExp}
                onChangeText={setPulseExp}
                placeholder="30"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Create General Circle EXP</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                keyboardType="number-pad"
                value={genCircleExp}
                onChangeText={setGenCircleExp}
                placeholder="40"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Create Consultation Circle EXP</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                keyboardType="number-pad"
                value={consultCircleExp}
                onChangeText={setConsultCircleExp}
                placeholder="60"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Create Referral Circle EXP</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                keyboardType="number-pad"
                value={refCircleExp}
                onChangeText={setRefCircleExp}
                placeholder="50"
                placeholderTextColor={C.textMuted}
              />
            </View>
          )}

          {/* TAB 3: Content Engagement Received */}
          {activeTab === "engagement" && (
            <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="heart-outline" size={20} color={C.actionPrimary} />
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Engagement Received EXP Rules</Text>
              </View>
              <Text style={[styles.cardSub, { color: C.textMuted }]}>EXP earned when users react to provider's posts:</Text>

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>EXP Per Clap Received</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                keyboardType="number-pad"
                value={clapExp}
                onChangeText={setClapExp}
                placeholder="2"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>EXP Per Like Received</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                keyboardType="number-pad"
                value={likeExp}
                onChangeText={setLikeExp}
                placeholder="3"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>EXP Per Comment Received</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                keyboardType="number-pad"
                value={commentExp}
                onChangeText={setCommentExp}
                placeholder="5"
                placeholderTextColor={C.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>EXP Per Share Received</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                keyboardType="number-pad"
                value={shareExp}
                onChangeText={setShareExp}
                placeholder="10"
                placeholderTextColor={C.textMuted}
              />
            </View>
          )}

          {/* TAB 4: Daily Activity & Sessions */}
          {activeTab === "sessions" && (
            <>
              <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="flame-outline" size={20} color="#F59E0B" />
                  <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Daily Sign-in EXP</Text>
                </View>
                <Text style={[styles.cardSub, { color: C.textMuted }]}>EXP awarded once per day upon application login:</Text>

                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Daily Sign-in EXP</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  keyboardType="number-pad"
                  value={dailySigninExp}
                  onChangeText={setDailySigninExp}
                  placeholder="10"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                  <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Consultation Sessions & Rating Bonuses</Text>
                </View>

                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Completed Session Base EXP</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  keyboardType="number-pad"
                  value={sessionBaseExp}
                  onChangeText={setSessionBaseExp}
                  placeholder="30"
                  placeholderTextColor={C.textMuted}
                />

                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>5-Star Rating Bonus EXP</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  keyboardType="number-pad"
                  value={star5Exp}
                  onChangeText={setStar5Exp}
                  placeholder="50"
                  placeholderTextColor={C.textMuted}
                />

                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>4-Star Rating Bonus EXP</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  keyboardType="number-pad"
                  value={star4Exp}
                  onChangeText={setStar4Exp}
                  placeholder="35"
                  placeholderTextColor={C.textMuted}
                />

                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>3-Star Rating Bonus EXP</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  keyboardType="number-pad"
                  value={star3Exp}
                  onChangeText={setStar3Exp}
                  placeholder="20"
                  placeholderTextColor={C.textMuted}
                />

                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>2-Star Rating Bonus EXP</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  keyboardType="number-pad"
                  value={star2Exp}
                  onChangeText={setStar2Exp}
                  placeholder="5"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </>
          )}

          {/* TAB 5: Tenure & Learn */}
          {activeTab === "tenure" && (
            <>
              <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="ribbon-outline" size={20} color="#8B5CF6" />
                  <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Platform Tenure & Anniversaries</Text>
                </View>
                <Text style={[styles.cardSub, { color: C.textMuted }]}>EXP awarded on each annual join date anniversary:</Text>

                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>EXP Awarded Per Year On Platform</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  keyboardType="number-pad"
                  value={tenureYearExp}
                  onChangeText={setTenureYearExp}
                  placeholder="500"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="school-outline" size={20} color={C.actionPrimary} />
                  <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Ambrosia Learn (Courses)</Text>
                </View>

                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Create Course EXP</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  keyboardType="number-pad"
                  value={createCourseExp}
                  onChangeText={setCreateCourseExp}
                  placeholder="100"
                  placeholderTextColor={C.textMuted}
                />

                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Student Course Enrollment EXP</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  keyboardType="number-pad"
                  value={enrollmentExp}
                  onChangeText={setEnrollmentExp}
                  placeholder="15"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </>
          )}

          {/* Main Save Action */}
          <TouchableOpacity
            style={[styles.bottomSaveBtn, { backgroundColor: C.actionPrimary }]}
            onPress={handleSaveAll}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.bottomSaveBtnText}>Save All Settings & Rules</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: { ...typeScale.bodyMedium },
  topSaveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  topSaveBtnText: { ...typeScale.labelSmall, color: "#FFFFFF", fontWeight: "700" },

  // Horizontal Tab Bar
  tabBarContainer: {
    borderBottomWidth: 1,
  },
  tabBarScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  tabLabel: { ...typeScale.labelSmall, fontSize: 12 },
  tabLabelActive: { fontWeight: "700" },

  // Scroll content
  scrollContent: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },

  // Cards
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardTitle: { ...typeScale.titleMedium, fontWeight: "700" },
  cardSub: { ...typeScale.bodySmall, marginBottom: spacing.md },

  // Switches
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchTextGroup: { flex: 1, paddingRight: spacing.md },
  switchLabel: { ...typeScale.labelMedium, fontWeight: "700" },
  switchDesc: { ...typeScale.bodySmall, marginTop: 2, fontSize: 11 },
  divider: { height: 1, marginVertical: spacing.md },

  // Threshold grid
  thresholdGrid: { gap: spacing.xs, marginTop: spacing.xs },
  thresholdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  tierNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tierName: { ...typeScale.labelMedium, fontWeight: "700" },
  thresholdRange: { ...typeScale.bodySmall },

  // Form Fields
  fieldLabel: {
    ...typeScale.labelSmall,
    marginTop: spacing.sm,
    marginBottom: 4,
    fontWeight: "600",
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    ...typeScale.bodyMedium,
  },

  // Save Buttons
  bottomSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  bottomSaveBtnText: { ...typeScale.labelMedium, color: "#FFFFFF", fontWeight: "700" },
});
