const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Custom config plugin to remove Push Notifications and Sign in with Apple
 * entitlements from iOS builds until proper APNs key is configured.
 */
const withCleanEntitlements = (config) => {
  return withEntitlementsPlist(config, (config) => {
    // Remove push notification entitlement
    delete config.modResults['aps-environment'];
    // Remove sign in with apple entitlement
    delete config.modResults['com.apple.developer.applesignin'];
    return config;
  });
};

module.exports = withCleanEntitlements;
