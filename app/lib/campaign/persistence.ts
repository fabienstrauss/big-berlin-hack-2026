import type { SupabaseClient } from '@supabase/supabase-js';

import { CAMPAIGN_CONFIG_ID, CAMPAIGN_CONFIG_TABLE } from '../supabase/constants';
import type { ChoiceConfig } from '../../components/workspace/ChoiceScreen';

type StoredCampaignConfigRow = {
  id: string;
  config: ChoiceConfig;
  updated_at?: string;
};

export async function loadCampaignConfig(client: SupabaseClient): Promise<ChoiceConfig | null> {
  const { data, error } = await client
    .from(CAMPAIGN_CONFIG_TABLE)
    .select('id, config, updated_at')
    .eq('id', CAMPAIGN_CONFIG_ID)
    .maybeSingle<StoredCampaignConfigRow>();

  if (error) {
    throw error;
  }

  if (!data || !data.config || Object.keys(data.config).length === 0) {
    return null;
  }

  return data.config;
}

export async function saveCampaignConfig(
  client: SupabaseClient,
  config: ChoiceConfig,
): Promise<void> {
  const { error } = await client.from(CAMPAIGN_CONFIG_TABLE).upsert({
    id: CAMPAIGN_CONFIG_ID,
    config,
  });

  if (error) {
    throw error;
  }
}
