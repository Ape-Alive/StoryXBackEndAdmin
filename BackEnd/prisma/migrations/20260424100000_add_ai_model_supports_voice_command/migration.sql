-- TTS 模型：是否支持语音指令（与绑定音色 supportsVoiceCommand 联动）
ALTER TABLE `ai_models`
  ADD COLUMN `supportsVoiceCommand` BOOLEAN NOT NULL DEFAULT FALSE AFTER `requiresKey`;
