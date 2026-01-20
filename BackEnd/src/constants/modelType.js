/**
 * 模型类型常量
 */
const MODEL_TYPE = {
  LLM: 'llm',           // 大语言模型
  VIDEO: 'video',       // 视频生成
  IMAGE: 'image',       // 图像生成
  TTS: 'tts'            // 语音合成
};

/**
 * 模型类型说明
 */
const MODEL_TYPE_DESC = {
  [MODEL_TYPE.LLM]: '大语言模型',
  [MODEL_TYPE.VIDEO]: '视频生成',
  [MODEL_TYPE.IMAGE]: '图像生成',
  [MODEL_TYPE.TTS]: '语音合成'
};

module.exports = {
  MODEL_TYPE,
  MODEL_TYPE_DESC
};
