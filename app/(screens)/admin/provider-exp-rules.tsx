import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

export default function AdminExpRulesScreen() {
  const router = useRouter();

  // Fetch the saved EXP reward rules from platform_settings
  const savedRules = useQuery(api.providerExp.getExpRewardRules) as any;

  const updateRulesMut = useMutation(api.providerExp.updateExpRewardRules);

  // Local draft state for EXP reward rules
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

  const [loading, setLoading] = useState(false);

  // Hydrate form fields from saved rules when they load
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

  const handleSave = async () => {
    try {
      setLoading(true);
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

      Alert.alert("Success", "Provider EXP reward rules updated successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update EXP rules");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Configure Provider EXP Rules</Text>
        <TouchableOpacity style={styles.saveBtnTop} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Rules</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section: Content Creation Rewards */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Content Creation EXP</Text>
          <Text style={styles.sectionSub}>Set EXP awarded when providers publish content</Text>

          <Text style={styles.label}>Publish Article EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={artExp} onChangeText={setArtExp} />

          <Text style={styles.label}>Publish Pulse (Reel/Post) EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={pulseExp} onChangeText={setPulseExp} />

          <Text style={styles.label}>Create General Circle EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={genCircleExp} onChangeText={setGenCircleExp} />

          <Text style={styles.label}>Create Consultation Circle EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={consultCircleExp} onChangeText={setConsultCircleExp} />

          <Text style={styles.label}>Create Referral Circle EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={refCircleExp} onChangeText={setRefCircleExp} />
        </View>

        {/* Section: Engagement Rewards */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Content Engagement Received</Text>
          <Text style={styles.sectionSub}>EXP awarded to provider when users engage with their content</Text>

          <Text style={styles.label}>EXP Per Clap</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={clapExp} onChangeText={setClapExp} />

          <Text style={styles.label}>EXP Per Like</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={likeExp} onChangeText={setLikeExp} />

          <Text style={styles.label}>EXP Per Comment</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={commentExp} onChangeText={setCommentExp} />

          <Text style={styles.label}>EXP Per Share</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={shareExp} onChangeText={setShareExp} />
        </View>

        {/* Section: Activity & Sign-in */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Daily Activity & Sign-in</Text>
          <Text style={styles.sectionSub}>EXP awarded once per calendar day on login</Text>

          <Text style={styles.label}>Daily Sign-in EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={dailySigninExp} onChangeText={setDailySigninExp} />
        </View>

        {/* Section: Sessions & Consultation Reviews */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Sessions & Consultee Star Reviews</Text>
          <Text style={styles.sectionSub}>EXP awarded per completed session & consultee rating</Text>

          <Text style={styles.label}>Completed Session Base EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={sessionBaseExp} onChangeText={setSessionBaseExp} />

          <Text style={styles.label}>5-Star Rating Bonus EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={star5Exp} onChangeText={setStar5Exp} />

          <Text style={styles.label}>4-Star Rating Bonus EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={star4Exp} onChangeText={setStar4Exp} />

          <Text style={styles.label}>3-Star Rating Bonus EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={star3Exp} onChangeText={setStar3Exp} />

          <Text style={styles.label}>2-Star Rating Bonus EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={star2Exp} onChangeText={setStar2Exp} />
        </View>

        {/* Section: Tenure (Years on Platform) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>5. Platform Tenure & Anniversaries</Text>
          <Text style={styles.sectionSub}>EXP awarded on each annual anniversary of join date</Text>

          <Text style={styles.label}>EXP Awarded Per Year On Platform</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={tenureYearExp} onChangeText={setTenureYearExp} />
        </View>

        {/* Section: Learn / Courses */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>6. Ambrosia Learn (Courses)</Text>
          <Text style={styles.sectionSub}>EXP awarded for creating courses and student enrollments</Text>

          <Text style={styles.label}>Create Course EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={createCourseExp} onChangeText={setCreateCourseExp} />

          <Text style={styles.label}>Student Course Enrollment EXP</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={enrollmentExp} onChangeText={setEnrollmentExp} />
        </View>

        <TouchableOpacity style={styles.saveBtnBottom} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnBottomText}>Save All Rule Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0A15",
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: "#0F101D",
    borderBottomWidth: 1,
    borderBottomColor: "#262945",
  },
  navBack: {
    padding: 4,
  },
  navTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  saveBtnTop: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  saveBtnText: {
    ...typeScale.labelSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    padding: spacing.md,
  },
  sectionCard: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: "#00BFA6",
    fontWeight: "700",
  },
  sectionSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  label: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
    marginTop: spacing.xs,
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
    ...typeScale.bodyMedium,
  },
  saveBtnBottom: {
    backgroundColor: "#00BFA6",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  saveBtnBottomText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
