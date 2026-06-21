import { useEffect, useMemo, useState } from "react";
import { useSettings } from "../context/SettingsContext.jsx";

const FORCE_MODAL_QUERY = "(max-width: 1024px), (pointer: coarse)";

function getForceModal() {
    if (typeof window === "undefined") return false;
    return window.matchMedia(FORCE_MODAL_QUERY).matches;
}

export function useDetailsMode() {
    const { settings } = useSettings();
    const [forceModal, setForceModal] = useState(getForceModal);

    useEffect(() => {
        const media = window.matchMedia(FORCE_MODAL_QUERY);

        const update = () => {
            setForceModal(media.matches);
        };

        update();

        if (media.addEventListener) {
            media.addEventListener("change", update);
            return () => media.removeEventListener("change", update);
        }

        media.addListener(update);
        return () => media.removeListener(update);
    }, []);

    const effectiveMode = useMemo(() => {
        if (forceModal) return "modal";
        return settings.detailsPosition === "modal" ? "modal" : "section";
    }, [forceModal, settings.detailsPosition]);

    return {
        forceModal,
        effectiveMode
    };
}