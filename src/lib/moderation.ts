import { prisma } from './db';
import { mockStore } from './mock-store';

export interface ModerationResult {
  isClean: boolean;
  shouldHold: boolean;
  shouldFlag: boolean;
  flagsToCreate: Array<{
    category: string;
    severity: string;
    matchedRule: string;
    reason: string;
    action: string;
  }>;
}

export async function evaluateMessageContent(content: string): Promise<ModerationResult> {
  let rules: Array<{ name: string; pattern: string; category: string; action: string; severity: string; isActive: boolean }> = [];
  try {
    rules = await prisma.moderationRule.findMany({
      where: { isActive: true },
    });
  } catch (err) {
    rules = mockStore.rules.filter((r) => r.isActive);
  }

  const flagsToCreate: ModerationResult['flagsToCreate'] = [];
  let shouldHold = false;
  let shouldFlag = false;

  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      const match = content.match(regex);

      if (match) {
        shouldFlag = true;

        // Contact sharing is ALWAYS held before delivery as per requirement 05
        const effectiveAction = rule.category === 'CONTACT_SHARING' ? 'HOLD' : rule.action;

        if (effectiveAction === 'HOLD') {
          shouldHold = true;
        }

        flagsToCreate.push({
          category: rule.category,
          severity: rule.severity,
          matchedRule: rule.name,
          reason: `Detected pattern "${match[0]}" violating ${rule.category} policy`,
          action: effectiveAction,
        });
      }
    } catch (err) {
      console.error(`Error executing rule ${rule.name}:`, err);
    }
  }

  // Fallback programmatic checks for safety
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
  const phoneRegex = /\+?[0-9]{1,3}[- ]?[0-9]{3,4}[- ]?[0-9]{3,4}/;
  if (!flagsToCreate.some((f) => f.category === 'CONTACT_SHARING')) {
    if (emailRegex.test(content) || phoneRegex.test(content)) {
      shouldHold = true;
      shouldFlag = true;
      flagsToCreate.push({
        category: 'CONTACT_SHARING',
        severity: 'CRITICAL',
        matchedRule: 'Direct Contact Policy (Fallback)',
        reason: 'Detected raw email address or telephone number',
        action: 'HOLD',
      });
    }
  }

  return {
    isClean: flagsToCreate.length === 0,
    shouldHold,
    shouldFlag,
    flagsToCreate,
  };
}
