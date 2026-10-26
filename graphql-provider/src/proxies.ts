import newrelic from 'newrelic/index';

// Taken from https://www.cloudflare.com/ips-v4 and https://www.cloudflare.com/ips-v6
// 2025-09-09T12:02+00:00

const fallbackCloudflareIps = [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '131.0.72.0/22',
    '2400:cb00::/32',
    '2606:4700::/32',
    '2803:f800::/32',
    '2405:b500::/32',
    '2405:8100::/32',
    '2a06:98c0::/29',
    '2c0f:f248::/32'
].sort();

const getTrustedCloudflareIps = async (): Promise<Array<string>> => {
    try {
        const cloudflareIpV4s = await fetch('https://cloudflare.com/ips-v4')
            .catch((err) => {
                throw new Error(`Failed to fetch trusted CloudFlare IPv4 addresses: ${err}`);
            })
            .then((r) => r.text())
            .then((x) => x.split('\n'));

        const cloudflareIpV6s = await fetch('https://cloudflare.com/ips-v6')
            .catch((err) => {
                throw new Error(`Failed to fetch trusted CloudFlare IPv6 addresses: ${err}`);
            })
            .then((r) => r.text())
            .then((x) => x.split('\n'));

        const cloudflareIps = [...cloudflareIpV4s, ...cloudflareIpV6s].sort();

        if (cloudflareIps.join(',') !== fallbackCloudflareIps.join(',')) {
            newrelic.noticeError(new Error(`Trusted Cloudflare IP addresses don't match hard-coded fallback values`), {
                caught: true,
                handled: true
            });
        }

        return cloudflareIps;
    } catch (err) {
        newrelic.noticeError(err, {
            caught: true,
            handled: true
        });

        return fallbackCloudflareIps;
    }
};

export const getTrustedProxies = async (): Promise<Array<string>> => {
    const trustedCloudflareIps = await getTrustedCloudflareIps();
    const trustedProxyIpsAndSubnets = process.env.TRUSTED_PROXY_IPS_AND_SUBNETS?.split(',') ?? [];

    return [...trustedProxyIpsAndSubnets, ...trustedCloudflareIps].filter(Boolean);
};
