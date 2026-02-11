const rateLimit = require('express-rate-limit');

/**
 * 公开接口速率限制
 * 用于保护不需要认证的公开接口，防止暴力攻击
 */
const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 300, // 限制每个 IP 在 15 分钟内最多 300 次请求（从100增加到300，避免前端频繁调用触发限流）
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true, // 返回速率限制信息到 `RateLimit-*` 响应头
    legacyHeaders: false, // 禁用 `X-RateLimit-*` 响应头
    // 使用真实 IP 地址（考虑代理）
    keyGenerator: (req) => {
        return req.realIp || req.ip || req.connection.remoteAddress;
    },
    // 自定义错误处理
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: '请求过于频繁，请稍后再试',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) // 返回重试时间（秒）
        });
    }
});

/**
 * 严格速率限制
 * 用于特别敏感的公开接口
 */
const strictLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 分钟
    max: 20, // 限制每个 IP 在 1 分钟内最多 20 次请求
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.realIp || req.ip || req.connection.remoteAddress;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: '请求过于频繁，请稍后再试',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

module.exports = {
    publicApiLimiter,
    strictLimiter
};
