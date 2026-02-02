/**
 * IP 地址提取中间件
 * 统一处理 IP 地址提取逻辑，支持代理和负载均衡场景
 */

/**
 * 从请求中提取客户端真实 IP 地址
 * 优先级：代理头 > Express req.ip > 直连地址
 * @param {Object} req - Express 请求对象
 * @returns {String} 客户端 IP 地址
 */
function extractIpAddress(req) {
    // 1. 优先检查 X-Forwarded-For 头（代理/负载均衡场景）
    // X-Forwarded-For 格式：client, proxy1, proxy2
    // 第一个 IP 是客户端真实 IP
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(ip => ip);
        if (ips.length > 0) {
            const clientIp = ips[0];
            // 处理 IPv6-mapped IPv4 地址
            if (clientIp.startsWith('::ffff:')) {
                return clientIp.substring(7);
            }
            return clientIp;
        }
    }

    // 2. 检查 X-Real-IP 头（Nginx 代理场景，直接返回客户端 IP）
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        const ip = realIp.trim();
        if (ip.startsWith('::ffff:')) {
            return ip.substring(7);
        }
        return ip;
    }

    // 3. 检查 CF-Connecting-IP 头（Cloudflare CDN 场景）
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp) {
        const ip = cfIp.trim();
        if (ip.startsWith('::ffff:')) {
            return ip.substring(7);
        }
        return ip;
    }

    // 4. 使用 Express 的 req.ip（需要配置 trust proxy）
    // 如果配置了 trust proxy，req.ip 会从 X-Forwarded-For 中提取客户端 IP
    if (req.ip) {
        const ip = req.ip.trim();
        if (ip.startsWith('::ffff:')) {
            return ip.substring(7);
        }
        return ip;
    }

    // 5. 直连场景：回退到 connection.remoteAddress（客户端直接连接，无代理）
    if (req.connection && req.connection.remoteAddress) {
        const addr = req.connection.remoteAddress.trim();
        if (addr.startsWith('::ffff:')) {
            return addr.substring(7);
        }
        return addr;
    }

    // 6. 最后回退到 socket.remoteAddress
    if (req.socket && req.socket.remoteAddress) {
        const addr = req.socket.remoteAddress.trim();
        if (addr.startsWith('::ffff:')) {
            return addr.substring(7);
        }
        return addr;
    }

    return 'unknown';
}

/**
 * IP 提取中间件
 * 将提取的 IP 地址附加到 req.realIp
 */
function ipExtractor(req, res, next) {
    req.realIp = extractIpAddress(req);
    next();
}

module.exports = {
    extractIpAddress,
    ipExtractor
};
