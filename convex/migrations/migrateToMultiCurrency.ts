import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration script to convert existing USD/NGN wallets to multi-currency structure
 * This migration will:
 * 1. Convert existing balanceUSD and balanceNGN to new balances object
 * 2. Set primary currency based on existing balance (NGN if has NGN balance, otherwise USD)
 * 3. Initialize all other currency balances to 0
 * 4. Set phoneCountryDetected to false for existing users (they'll need to update)
 */
export const migrateWalletsToMultiCurrency = internalMutation({
  args: {
    batchSize: v.optional(v.number()), // Number of wallets to migrate per batch
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100;
    let migratedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Get all existing wallets that need migration
      const walletsToMigrate = await ctx.db
        .query("wallets")
        .filter((q) => q.eq(q.field("primaryCurrency"), undefined))
        .take(batchSize);

      console.log(`Found ${walletsToMigrate.length} wallets to migrate`);

      for (const wallet of walletsToMigrate) {
        try {
          // Extract existing balances (with fallback for any missing fields)
          const existingUSD = (wallet as any).balanceUSD || 0;
          const existingNGN = (wallet as any).balanceNGN || 0;

          // Determine primary currency based on existing balances
          let primaryCurrency = "USD"; // Default
          if (existingNGN > 0 && existingUSD === 0) {
            primaryCurrency = "NGN";
          } else if (existingUSD > 0) {
            primaryCurrency = "USD";
          }

          // Create new multi-currency balance structure
          const newBalances = {
            USD: existingUSD,
            NGN: existingNGN,
            GBP: 0,
            EUR: 0,
            CAD: 0,
            GHS: 0,
            KES: 0,
            GMD: 0,
            ZAR: 0
          };

          // Update wallet with new structure
          await ctx.db.patch(wallet._id, {
            primaryCurrency,
            phoneCountryDetected: false, // Existing users need to update phone
            balances: newBalances,
            updatedAt: Date.now()
          });

          migratedCount++;
          console.log(`Migrated wallet for user ${wallet.userId}: ${primaryCurrency} (USD: ${existingUSD}, NGN: ${existingNGN})`);

        } catch (error) {
          errorCount++;
          const errorMsg = `Failed to migrate wallet ${wallet._id}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      const result = {
        success: true,
        migratedCount,
        errorCount,
        errors,
        hasMore: walletsToMigrate.length === batchSize
      };

      console.log(`Migration batch completed: ${migratedCount} migrated, ${errorCount} errors`);
      return result;

    } catch (error) {
      console.error("Migration failed:", error);
      return {
        success: false,
        migratedCount,
        errorCount: errorCount + 1,
        errors: [...errors, `Migration batch failed: ${error}`],
        hasMore: false
      };
    }
  },
});

/**
 * Initialize currency metadata for all supported currencies
 */
export const initializeCurrencyMetadata = internalMutation({
  args: {},
  handler: async (ctx) => {
    const supportedCurrencies = [
      { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
      { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimals: 2 },
      { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
      { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimals: 2 },
      { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", decimals: 2 },
      { code: "KES", name: "Kenyan Shilling", symbol: "KSh", decimals: 2 },
      { code: "GMD", name: "Gambian Dalasi", symbol: "D", decimals: 2 },
      { code: "ZAR", name: "South African Rand", symbol: "R", decimals: 2 }
    ];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const currency of supportedCurrencies) {
      // Check if currency already exists
      const existing = await ctx.db
        .query("currencyMetadata")
        .withIndex("by_code", (q) => q.eq("code", currency.code))
        .first();

      if (!existing) {
        await ctx.db.insert("currencyMetadata", {
          ...currency,
          isActive: true,
          createdAt: Date.now()
        });
        insertedCount++;
        console.log(`Initialized currency metadata for ${currency.code}`);
      } else {
        skippedCount++;
        console.log(`Currency metadata for ${currency.code} already exists`);
      }
    }

    return {
      success: true,
      insertedCount,
      skippedCount,
      totalCurrencies: supportedCurrencies.length
    };
  },
});

/**
 * Validate migration results
 */
export const validateMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      // Count wallets with old structure
      const oldStructureWallets = await ctx.db
        .query("wallets")
        .filter((q) => q.eq(q.field("primaryCurrency"), undefined))
        .collect();

      // Count wallets with new structure
      const newStructureWallets = await ctx.db
        .query("wallets")
        .filter((q) => q.neq(q.field("primaryCurrency"), undefined))
        .collect();

      // Validate balance consistency for a sample
      let validationErrors: string[] = [];
      const sampleWallets = newStructureWallets.slice(0, 10);

      for (const wallet of sampleWallets) {
        const balances = wallet.balances as any;
        
        // Check if all required currencies exist
        const requiredCurrencies = ["USD", "NGN", "GBP", "EUR", "CAD", "GHS", "KES", "GMD", "ZAR"];
        for (const currency of requiredCurrencies) {
          if (typeof balances[currency] !== "number") {
            validationErrors.push(`Wallet ${wallet._id} missing ${currency} balance`);
          }
        }

        // Check primary currency is valid
        if (!requiredCurrencies.includes(wallet.primaryCurrency)) {
          validationErrors.push(`Wallet ${wallet._id} has invalid primary currency: ${wallet.primaryCurrency}`);
        }
      }

      return {
        success: true,
        oldStructureCount: oldStructureWallets.length,
        newStructureCount: newStructureWallets.length,
        validationErrors,
        isComplete: oldStructureWallets.length === 0
      };

    } catch (error) {
      return {
        success: false,
        error: `Validation failed: ${error}`
      };
    }
  },
});