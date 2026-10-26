interface Window {
    newrelic?: {
        noticeError: (error: Error, options?: { [key: string]: any }) => void;
    };

    // FIXME(cj): We can do better than this
    Cypress: any;
    dataLayer: any;
}
