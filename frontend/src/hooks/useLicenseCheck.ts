import { useState, useEffect, useRef } from 'react';
import { apiBaseUrl } from '../api/apiBaseUrl';

const intervalMs = 1 * 60 * 1000;

interface LicenseCheckData {
    isOfflineTooLong: boolean;
}

export const useLicenseCheck = () => {
    const [licenseData, setLicenseData] = useState<LicenseCheckData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const lastIsOfflineRef = useRef<boolean | null>(null);
    const didInitRef = useRef(false);

    useEffect(() => {
        const fetchOnce = async () => {
            try {
                // Vendos loading vetëm në thirrjen e parë
                if (!didInitRef.current) {
                    setLoading(true);
                }

                const res = await fetch(`${apiBaseUrl}kiosk_client_app.utils.daily_license_check.has_been_offline_too_long`);
                if (!res.ok) throw new Error(`API error: ${res.status}`);
                const data = await res.json();

                let isOfflineTooLong = false;
                if (typeof data?.message === 'boolean') isOfflineTooLong = data.message;
                else if (typeof data?.message?.isOfflineTooLong === 'boolean') isOfflineTooLong = data.message.isOfflineTooLong;
                else if (typeof data === 'boolean') isOfflineTooLong = data;

                if (lastIsOfflineRef.current !== isOfflineTooLong) {
                    lastIsOfflineRef.current = isOfflineTooLong;
                    setLicenseData({ isOfflineTooLong });
                }
                setError(null);
            } catch (e: unknown) {
                setError((e instanceof Error && e.message) || 'Unknown error');
            } finally {
                if (!didInitRef.current) {
                    setLoading(false);    
                    didInitRef.current = true;
                }
            }
        };

        fetchOnce();
        const id = window.setInterval(fetchOnce, intervalMs);
        return () => clearInterval(id);
    }, []);

    return { licenseData, loading, error };
};