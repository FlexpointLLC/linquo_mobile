import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CreditCard, Check } from 'lucide-react-native';

interface BillingContentProps {
  conversationCount: number;
  plan: string;
  isDarkMode: boolean;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  cardBg: string;
  onShowNotification?: (message: string, type: 'success' | 'error') => void;
}

export function BillingContent({
  conversationCount,
  plan,
  isDarkMode,
  textColor,
  mutedColor,
  borderColor,
  cardBg,
  onShowNotification,
}: BillingContentProps) {
  const isPaid = plan === 'paid';
  const usagePercentage = Math.min(conversationCount, 100);
  const isLimitReached = conversationCount >= 100;

  const handleUpgradeClick = () => {
    if (onShowNotification) {
      onShowNotification('Our app is completely free for now', 'success');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Billing & Plans</Text>
      </View>

      {/* Current Status Card */}
      <View style={[styles.statusCard, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)', borderColor }]}>
        <View style={styles.statusLeft}>
          <View style={styles.statusIndicator}>
            <View style={styles.greenDot} />
            <View>
              <Text style={[styles.statusTitle, { color: textColor }]}>
                {isPaid ? 'Currently on Pro Plan' : 'Currently on Free Plan'}
              </Text>
              <Text style={[styles.statusSubtitle, { color: mutedColor }]}>
                {isPaid ? 'Unlimited conversations • All features' : '100 conversations • Basic features'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.statusRight}>
          <Text style={[styles.priceAmount, { color: textColor }]}>${isPaid ? '2' : '0'}</Text>
          <Text style={[styles.priceLabel, { color: mutedColor }]}>per month</Text>
        </View>
      </View>

      {/* Upgrade Section */}
      <View style={[styles.upgradeCard, { backgroundColor: cardBg, borderColor }]}>
        {/* Upgrade Header */}
        <View style={styles.upgradeHeader}>
          <Text style={[styles.upgradeTitle, { color: textColor }]}>Upgrade to Pro</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceOnly, { color: mutedColor }]}>Only</Text>
            <Text style={[styles.priceLarge, { color: textColor }]}>$2</Text>
            <Text style={[styles.priceMonth, { color: mutedColor }]}>/month</Text>
          </View>
        </View>

        {/* Upgrade Button */}
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgradeClick}
        >
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </TouchableOpacity>
        <Text style={[styles.upgradeNote, { color: mutedColor }]}>
          Cancel anytime • No hidden fees
        </Text>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={[styles.featuresTitle, { color: mutedColor }]}>WHAT YOU GET</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={[styles.featureText, { color: textColor }]}>Unlimited conversations</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={[styles.featureText, { color: textColor }]}>Advanced customization</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={[styles.featureText, { color: textColor }]}>Remove branding</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={[styles.featureText, { color: textColor }]}>Priority support</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Usage Stats */}
      <View style={[styles.usageCard, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.usageTitle, { color: textColor }]}>Current Usage</Text>
        <View style={styles.usageItem}>
          <View style={styles.usageHeader}>
            <Text style={[styles.usageLabel, { color: textColor }]}>Total conversations</Text>
            <Text style={[styles.usageValue, { color: mutedColor }]}>
              {conversationCount} / 100
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${usagePercentage}%`,
                  backgroundColor: isLimitReached ? '#f97316' : '#3b82f6',
                },
              ]}
            />
          </View>
          {!isPaid && isLimitReached && (
            <Text style={styles.limitWarning}>
              You've reached your conversation limit. Upgrade to Pro for unlimited conversations.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  statusLeft: {
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 12,
  },
  statusRight: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceLabel: {
    fontSize: 11,
  },
  upgradeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  upgradeHeader: {
    marginBottom: 16,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceOnly: {
    fontSize: 14,
  },
  priceLarge: {
    fontSize: 28,
    fontWeight: '700',
  },
  priceMonth: {
    fontSize: 14,
  },
  upgradeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeNote: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresSection: {
    gap: 12,
  },
  featuresTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  featuresGrid: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  featureText: {
    fontSize: 14,
  },
  usageCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  usageItem: {
    gap: 8,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageLabel: {
    fontSize: 14,
  },
  usageValue: {
    fontSize: 14,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 9999,
    transition: 'width 0.3s ease',
  },
  limitWarning: {
    fontSize: 12,
    color: '#f97316',
    marginTop: 4,
  },
});

