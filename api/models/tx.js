const { matchModelName, findMatchingPattern } = require('@librechat/api');
const defaultRate = 0.006;

/**
 * AWS Bedrock pricing
 * source: https://aws.amazon.com/bedrock/pricing/
 * */
const bedrockValues = {
  // Basic llama2 patterns (base defaults to smallest variant)
  llama2: { prompt: 0.00075, completion: 0.001 },
  'llama-2': { prompt: 0.00075, completion: 0.001 },
  'llama2-13b': { prompt: 0.00075, completion: 0.001 },
  'llama2:70b': { prompt: 0.00195, completion: 0.00256 },
  'llama2-70b': { prompt: 0.00195, completion: 0.00256 },

  // Basic llama3 patterns (base defaults to smallest variant)
  llama3: { prompt: 0.0003, completion: 0.0006 },
  'llama-3': { prompt: 0.0003, completion: 0.0006 },
  'llama3-8b': { prompt: 0.0003, completion: 0.0006 },
  'llama3:8b': { prompt: 0.0003, completion: 0.0006 },
  'llama3-70b': { prompt: 0.00265, completion: 0.0035 },
  'llama3:70b': { prompt: 0.00265, completion: 0.0035 },

  // llama3-x-Nb pattern (base defaults to smallest variant)
  'llama3-1': { prompt: 0.00022, completion: 0.00022 },
  'llama3-1-8b': { prompt: 0.00022, completion: 0.00022 },
  'llama3-1-70b': { prompt: 0.00072, completion: 0.00072 },
  'llama3-1-405b': { prompt: 0.0024, completion: 0.0024 },
  'llama3-2': { prompt: 0.0001, completion: 0.0001 },
  'llama3-2-1b': { prompt: 0.0001, completion: 0.0001 },
  'llama3-2-3b': { prompt: 0.00015, completion: 0.00015 },
  'llama3-2-11b': { prompt: 0.00016, completion: 0.00016 },
  'llama3-2-90b': { prompt: 0.00072, completion: 0.00072 },
  'llama3-3': { prompt: 0.00265, completion: 0.0035 },
  'llama3-3-70b': { prompt: 0.00265, completion: 0.0035 },

  // llama3.x:Nb pattern (base defaults to smallest variant)
  'llama3.1': { prompt: 0.00022, completion: 0.00022 },
  'llama3.1:8b': { prompt: 0.00022, completion: 0.00022 },
  'llama3.1:70b': { prompt: 0.00072, completion: 0.00072 },
  'llama3.1:405b': { prompt: 0.0024, completion: 0.0024 },
  'llama3.2': { prompt: 0.0001, completion: 0.0001 },
  'llama3.2:1b': { prompt: 0.0001, completion: 0.0001 },
  'llama3.2:3b': { prompt: 0.00015, completion: 0.00015 },
  'llama3.2:11b': { prompt: 0.00016, completion: 0.00016 },
  'llama3.2:90b': { prompt: 0.00072, completion: 0.00072 },
  'llama3.3': { prompt: 0.00265, completion: 0.0035 },
  'llama3.3:70b': { prompt: 0.00265, completion: 0.0035 },

  // llama-3.x-Nb pattern (base defaults to smallest variant)
  'llama-3.1': { prompt: 0.00022, completion: 0.00022 },
  'llama-3.1-8b': { prompt: 0.00022, completion: 0.00022 },
  'llama-3.1-70b': { prompt: 0.00072, completion: 0.00072 },
  'llama-3.1-405b': { prompt: 0.0024, completion: 0.0024 },
  'llama-3.2': { prompt: 0.0001, completion: 0.0001 },
  'llama-3.2-1b': { prompt: 0.0001, completion: 0.0001 },
  'llama-3.2-3b': { prompt: 0.00015, completion: 0.00015 },
  'llama-3.2-11b': { prompt: 0.00016, completion: 0.00016 },
  'llama-3.2-90b': { prompt: 0.00072, completion: 0.00072 },
  'llama-3.3': { prompt: 0.00265, completion: 0.0035 },
  'llama-3.3-70b': { prompt: 0.00265, completion: 0.0035 },
  'mistral-7b': { prompt: 0.00015, completion: 0.0002 },
  'mistral-small': { prompt: 0.00015, completion: 0.0002 },
  'mixtral-8x7b': { prompt: 0.00045, completion: 0.0007 },
  'mistral-large-2402': { prompt: 0.004, completion: 0.012 },
  'mistral-large-2407': { prompt: 0.003, completion: 0.009 },
  'command-text': { prompt: 0.0015, completion: 0.002 },
  'command-light': { prompt: 0.0003, completion: 0.0006 },
  // AI21 models
  'j2-mid': { prompt: 0.0125, completion: 0.0125 },
  'j2-ultra': { prompt: 0.0188, completion: 0.0188 },
  'jamba-instruct': { prompt: 0.0005, completion: 0.0007 },
  // Amazon Titan models
  'titan-text-lite': { prompt: 0.00015, completion: 0.0002 },
  'titan-text-express': { prompt: 0.0002, completion: 0.0006 },
  'titan-text-premier': { prompt: 0.0005, completion: 0.0015 },
  // Amazon Nova models
  'nova-micro': { prompt: 0.000035, completion: 0.00014 },
  'nova-lite': { prompt: 0.00006, completion: 0.00024 },
  'nova-pro': { prompt: 0.0008, completion: 0.0032 },
  'nova-premier': { prompt: 0.0025, completion: 0.0125 },
  'deepseek.r1': { prompt: 0.00135, completion: 0.0054 },
};

/**
 * Mapping of model token sizes to their respective multipliers for prompt and completion.
 * The rates are 1 USD per 1K tokens (changed from 1M tokens).
 * @type {Object.<string, {prompt: number, completion: number}>}
 */
const tokenValues = Object.assign(
  {
    // Legacy token size mappings (generic patterns - check LAST)
    '8k': { prompt: 0.03, completion: 0.06 },
    '32k': { prompt: 0.06, completion: 0.12 },
    '4k': { prompt: 0.0015, completion: 0.002 },
    '16k': { prompt: 0.003, completion: 0.004 },
    // Generic fallback patterns (check LAST)
    'claude-': { prompt: 0.0008, completion: 0.0024 },
    deepseek: { prompt: 0.00028, completion: 0.00042 },
    command: { prompt: 0.00038, completion: 0.00038 },
    gemma: { prompt: 0.00002, completion: 0.00004 }, // Base pattern (using gemma-3n-e4b pricing)
    gemini: { prompt: 0.0005, completion: 0.0015 },
    'gpt-oss': { prompt: 0.00005, completion: 0.0002 },
    // Specific model variants (check FIRST - more specific patterns at end)
    'gpt-3.5-turbo-1106': { prompt: 0.001, completion: 0.002 },
    'gpt-3.5-turbo-0125': { prompt: 0.0005, completion: 0.0015 },
    'gpt-4-1106': { prompt: 0.01, completion: 0.03 },
    'gpt-4.1': { prompt: 0.002, completion: 0.008 },
    'gpt-4.1-nano': { prompt: 0.0001, completion: 0.0004 },
    'gpt-4.1-mini': { prompt: 0.0004, completion: 0.0016 },
    'gpt-4.5': { prompt: 0.075, completion: 0.15 },
    'gpt-4o': { prompt: 0.0025, completion: 0.01 },
    'gpt-4o-2024-05-13': { prompt: 0.005, completion: 0.015 },
    'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
    'gpt-5': { prompt: 0.00125, completion: 0.01 },
    'gpt-5-nano': { prompt: 0.00005, completion: 0.0004 },
    'gpt-5-mini': { prompt: 0.0005, completion: 0.004 }, //modified
    'gpt-5-pro': { prompt: 0.015, completion: 0.12 },
    'gpt-5.2': { prompt: 0.0026, completion: 0.021 }, //modified
    o1: { prompt: 0.015, completion: 0.06 },
    'o1-mini': { prompt: 0.0011, completion: 0.0044 },
    'o1-preview': { prompt: 0.015, completion: 0.06 },
    o3: { prompt: 0.002, completion: 0.008 },
    'o3-mini': { prompt: 0.0011, completion: 0.0044 },
    'o4-mini': { prompt: 0.0011, completion: 0.0044 },
    'claude-instant': { prompt: 0.0008, completion: 0.0024 },
    'claude-2': { prompt: 0.008, completion: 0.024 },
    'claude-2.1': { prompt: 0.008, completion: 0.024 },
    'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
    'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
    'claude-3-opus': { prompt: 0.015, completion: 0.075 },
    'claude-3-5-haiku': { prompt: 0.0008, completion: 0.004 },
    'claude-3.5-haiku': { prompt: 0.0008, completion: 0.004 },
    'claude-3-5-sonnet': { prompt: 0.003, completion: 0.015 },
    'claude-3.5-sonnet': { prompt: 0.003, completion: 0.015 },
    'claude-3-7-sonnet': { prompt: 0.003, completion: 0.015 },
    'claude-3.7-sonnet': { prompt: 0.003, completion: 0.015 },
    'claude-haiku-4-5': { prompt: 0.001, completion: 0.005 },
    'claude-opus-4': { prompt: 0.015, completion: 0.075 },
    'claude-opus-4-5': { prompt: 0.005, completion: 0.025 },
    'claude-sonnet-4-5': { prompt: 0.003, completion: 0.015 },
    'claude-sonnet-4': { prompt: 0.003, completion: 0.015 },
    'command-r': { prompt: 0.0005, completion: 0.0015 },
    'command-r-plus': { prompt: 0.003, completion: 0.015 },
    'command-text': { prompt: 0.0015, completion: 0.002 },
    'deepseek-chat': { prompt: 0.00028, completion: 0.00042 },
    'deepseek-reasoner': { prompt: 0.00028, completion: 0.00042 },
    'deepseek-r1': { prompt: 0.0004, completion: 0.002 },
    'deepseek-v3': { prompt: 0.0002, completion: 0.0008 },
    'gemma-2': { prompt: 0.00001, completion: 0.00003 }, // Base pattern (using gemma-2-9b pricing)
    'gemma-3': { prompt: 0.00002, completion: 0.00004 }, // Base pattern (using gemma-3n-e4b pricing)
    'gemma-3-27b': { prompt: 0.00009, completion: 0.00016 },
    'gemini-1.5': { prompt: 0.0025, completion: 0.01 },
    'gemini-1.5-flash': { prompt: 0.00015, completion: 0.0006 },
    'gemini-1.5-flash-8b': { prompt: 0.000075, completion: 0.0003 },
    'gemini-2.0': { prompt: 0.0001, completion: 0.0004 }, // Base pattern (using 2.0-flash pricing)
    'gemini-2.0-flash': { prompt: 0.0001, completion: 0.0004 },
    'gemini-2.0-flash-lite': { prompt: 0.000075, completion: 0.0003 },
    'gemini-2.5': { prompt: 0.0003, completion: 0.0025 }, // Base pattern (using 2.5-flash pricing)
    'gemini-2.5-flash': { prompt: 0.0005, completion: 0.004 }, // modified
    'gemini-2.5-flash-lite': { prompt: 0.0001, completion: 0.0004 },
    'gemini-2.5-pro': { prompt: 0.003, completion: 0.018 }, // modified
    'gemini-3-flash': { prompt: 0.0008, completion: 0.005 }, // modified
    'gemini-3-pro': { prompt: 0.0022, completion: 0.014 }, // modified
    'gemini-3-pro-image': { prompt: 2, completion: 120 },
    'gemini-pro-vision': { prompt: 0.0005, completion: 0.0015 },
    grok: { prompt: 0.002, completion: 0.01 }, // Base pattern defaults to grok-2
    'grok-beta': { prompt: 0.005, completion: 0.015 },
    'grok-vision-beta': { prompt: 0.005, completion: 0.015 },
    'grok-2': { prompt: 0.002, completion: 0.01 },
    'grok-2-1212': { prompt: 0.002, completion: 0.01 },
    'grok-2-latest': { prompt: 0.002, completion: 0.01 },
    'grok-2-vision': { prompt: 0.002, completion: 0.01 },
    'grok-2-vision-1212': { prompt: 0.002, completion: 0.01 },
    'grok-2-vision-latest': { prompt: 0.002, completion: 0.01 },
    'grok-3': { prompt: 0.003, completion: 0.015 },
    'grok-3-fast': { prompt: 0.005, completion: 0.025 },
    'grok-3-mini': { prompt: 0.0003, completion: 0.0005 },
    'grok-3-mini-fast': { prompt: 0.0006, completion: 0.004 },
    'grok-4': { prompt: 0.005, completion: 0.02 }, // modified
    'grok-4-fast': { prompt: 0.0002, completion: 0.0005 },
    'grok-4-1-fast': { prompt: 0.0005, completion: 0.0015 }, // modified, covers reasoning & non-reasoning variants
    'grok-code-fast': { prompt: 0.0002, completion: 0.0015 },
    codestral: { prompt: 0.0003, completion: 0.0009 },
    'ministral-3b': { prompt: 0.00004, completion: 0.00004 },
    'ministral-8b': { prompt: 0.0001, completion: 0.0001 },
    'mistral-nemo': { prompt: 0.00015, completion: 0.00015 },
    'mistral-saba': { prompt: 0.0002, completion: 0.0006 },
    'pixtral-large': { prompt: 0.002, completion: 0.006 },
    'mistral-large': { prompt: 0.002, completion: 0.006 },
    'mixtral-8x22b': { prompt: 0.00065, completion: 0.00065 },
    kimi: { prompt: 0.00014, completion: 0.00249 }, // Base pattern (using kimi-k2 pricing)
    // GPT-OSS models (specific sizes)
    'gpt-oss:20b': { prompt: 0.00005, completion: 0.0002 },
    'gpt-oss-20b': { prompt: 0.00005, completion: 0.0002 },
    'gpt-oss:120b': { prompt: 0.00015, completion: 0.0006 },
    'gpt-oss-120b': { prompt: 0.00015, completion: 0.0006 },
    // GLM models (Zhipu AI) - general to specific
    glm4: { prompt: 0.0001, completion: 0.0001 },
    'glm-4': { prompt: 0.0001, completion: 0.0001 },
    'glm-4-32b': { prompt: 0.0001, completion: 0.0001 },
    'glm-4.5': { prompt: 0.00035, completion: 0.00155 },
    'glm-4.5-air': { prompt: 0.00014, completion: 0.00086 },
    'glm-4.5v': { prompt: 0.0006, completion: 0.0018 },
    'glm-4.6': { prompt: 0.0005, completion: 0.00175 },
    // Qwen models
    qwen: { prompt: 0.00008, completion: 0.00033 }, // Qwen base pattern (using qwen2.5-72b pricing)
    'qwen2.5': { prompt: 0.00008, completion: 0.00033 }, // Qwen 2.5 base pattern
    'qwen-turbo': { prompt: 0.00005, completion: 0.0002 },
    'qwen-plus': { prompt: 0.0004, completion: 0.0012 },
    'qwen-max': { prompt: 0.0016, completion: 0.0064 },
    'qwq-32b': { prompt: 0.00015, completion: 0.0004 },
    // Qwen3 models
    qwen3: { prompt: 0.000035, completion: 0.000138 }, // Qwen3 base pattern (using qwen3-4b pricing)
    'qwen3-8b': { prompt: 0.000035, completion: 0.000138 },
    'qwen3-14b': { prompt: 0.00005, completion: 0.00022 },
    'qwen3-30b-a3b': { prompt: 0.00006, completion: 0.00022 },
    'qwen3-32b': { prompt: 0.00005, completion: 0.0002 },
    'qwen3-235b-a22b': { prompt: 0.00008, completion: 0.00055 },
    // Qwen3 VL (Vision-Language) models
    'qwen3-vl-8b-thinking': { prompt: 0.00018, completion: 0.0021 },
    'qwen3-vl-8b-instruct': { prompt: 0.00018, completion: 0.00069 },
    'qwen3-vl-30b-a3b': { prompt: 0.00029, completion: 0.001 },
    'qwen3-vl-235b-a22b': { prompt: 0.0003, completion: 0.0012 },
    // Qwen3 specialized models
    'qwen3-max': { prompt: 0.0012, completion: 0.006 },
    'qwen3-coder': { prompt: 0.00022, completion: 0.00095 },
    'qwen3-coder-30b-a3b': { prompt: 0.00006, completion: 0.00025 },
    'qwen3-coder-plus': { prompt: 0.001, completion: 0.005 },
    'qwen3-coder-flash': { prompt: 0.0003, completion: 0.0015 },
    'qwen3-next-80b-a3b': { prompt: 0.0001, completion: 0.0008 },
  },
  bedrockValues,
);

/**
 * Mapping of model token sizes to their respective multipliers for cached input, read and write.
 * See Anthropic's documentation on this: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching#pricing
 * The rates are 1 USD per 1K tokens (changed from 1M tokens).
 * @type {Object.<string, {write: number, read: number }>}
 */
const cacheTokenValues = {
  'claude-3.7-sonnet': { write: 0.00375, read: 0.0003 },
  'claude-3-7-sonnet': { write: 0.00375, read: 0.0003 },
  'claude-3.5-sonnet': { write: 0.00375, read: 0.0003 },
  'claude-3-5-sonnet': { write: 0.00375, read: 0.0003 },
  'claude-3.5-haiku': { write: 0.001, read: 0.00008 },
  'claude-3-5-haiku': { write: 0.001, read: 0.00008 },
  'claude-3-haiku': { write: 0.0003, read: 0.00003 },
  'claude-haiku-4-5': { write: 0.00125, read: 0.0001 },
  'claude-sonnet-4': { write: 0.00375, read: 0.0003 },
  'claude-opus-4': { write: 0.01875, read: 0.0015 },
  'claude-opus-4-5': { write: 0.00625, read: 0.0005 },
  // DeepSeek models - cache hit: $0.028/1M, cache miss: $0.28/1M
  deepseek: { write: 0.00028, read: 0.000028 },
  'deepseek-chat': { write: 0.00028, read: 0.000028 },
  'deepseek-reasoner': { write: 0.00028, read: 0.000028 },
};

/**
 * Retrieves the key associated with a given model name.
 *
 * @param {string} model - The model name to match.
 * @param {string} endpoint - The endpoint name to match.
 * @returns {string|undefined} The key corresponding to the model name, or undefined if no match is found.
 */
const getValueKey = (model, endpoint) => {
  if (!model || typeof model !== 'string') {
    return undefined;
  }

  // Use findMatchingPattern directly against tokenValues for efficient lookup
  if (!endpoint || (typeof endpoint === 'string' && !tokenValues[endpoint])) {
    const matchedKey = findMatchingPattern(model, tokenValues);
    if (matchedKey) {
      return matchedKey;
    }
  }

  // Fallback: use matchModelName for edge cases and legacy handling
  const modelName = matchModelName(model, endpoint);
  if (!modelName) {
    return undefined;
  }

  // Legacy token size mappings and aliases for older models
  if (modelName.includes('gpt-3.5-turbo-16k')) {
    return '16k';
  } else if (modelName.includes('gpt-3.5')) {
    return '4k';
  } else if (modelName.includes('gpt-4-vision')) {
    return 'gpt-4-1106'; // Alias for gpt-4-vision
  } else if (modelName.includes('gpt-4-0125')) {
    return 'gpt-4-1106'; // Alias for gpt-4-0125
  } else if (modelName.includes('gpt-4-turbo')) {
    return 'gpt-4-1106'; // Alias for gpt-4-turbo
  } else if (modelName.includes('gpt-4-32k')) {
    return '32k';
  } else if (modelName.includes('gpt-4')) {
    return '8k';
  }

  return undefined;
};

/**
 * Retrieves the multiplier for a given value key and token type. If no value key is provided,
 * it attempts to derive it from the model name.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} [params.valueKey] - The key corresponding to the model name.
 * @param {'prompt' | 'completion'} [params.tokenType] - The type of token (e.g., 'prompt' or 'completion').
 * @param {string} [params.model] - The model name to derive the value key from if not provided.
 * @param {string} [params.endpoint] - The endpoint name to derive the value key from if not provided.
 * @param {EndpointTokenConfig} [params.endpointTokenConfig] - The token configuration for the endpoint.
 * @returns {number} The multiplier for the given parameters, or a default value if not found.
 */
const getMultiplier = ({ valueKey, tokenType, model, endpoint, endpointTokenConfig }) => {
  if (endpointTokenConfig) {
    return endpointTokenConfig?.[model]?.[tokenType] ?? defaultRate;
  }

  if (valueKey && tokenType) {
    return tokenValues[valueKey][tokenType] ?? defaultRate;
  }

  if (!tokenType || !model) {
    return 1;
  }

  valueKey = getValueKey(model, endpoint);
  if (!valueKey) {
    return defaultRate;
  }

  // If we got this far, and values[tokenType] is undefined somehow, return a rough average of default multipliers
  return tokenValues[valueKey]?.[tokenType] ?? defaultRate;
};

/**
 * Retrieves the cache multiplier for a given value key and token type. If no value key is provided,
 * it attempts to derive it from the model name.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} [params.valueKey] - The key corresponding to the model name.
 * @param {'write' | 'read'} [params.cacheType] - The type of token (e.g., 'write' or 'read').
 * @param {string} [params.model] - The model name to derive the value key from if not provided.
 * @param {string} [params.endpoint] - The endpoint name to derive the value key from if not provided.
 * @param {EndpointTokenConfig} [params.endpointTokenConfig] - The token configuration for the endpoint.
 * @returns {number | null} The multiplier for the given parameters, or `null` if not found.
 */
const getCacheMultiplier = ({ valueKey, cacheType, model, endpoint, endpointTokenConfig }) => {
  if (endpointTokenConfig) {
    return endpointTokenConfig?.[model]?.[cacheType] ?? null;
  }

  if (valueKey && cacheType) {
    return cacheTokenValues[valueKey]?.[cacheType] ?? null;
  }

  if (!cacheType || !model) {
    return null;
  }

  valueKey = getValueKey(model, endpoint);
  if (!valueKey) {
    return null;
  }

  // If we got this far, and values[cacheType] is undefined somehow, return a rough average of default multipliers
  return cacheTokenValues[valueKey]?.[cacheType] ?? null;
};

module.exports = {
  tokenValues,
  getValueKey,
  getMultiplier,
  getCacheMultiplier,
  defaultRate,
  cacheTokenValues,
};
