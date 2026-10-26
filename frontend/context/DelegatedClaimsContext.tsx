import {
    createContext,
    type MutableRefObject,
    type PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

export type DelegatedClaims = {
    schoolId?: string;
};

type Subscriber<T> = (x: T) => void;

type DelegatedClaimsInterface = {
    claimsRef: MutableRefObject<DelegatedClaims>;
    subscribe(fn: (claims: DelegatedClaims) => void): () => void;
    setClaims: (newClaims: DelegatedClaims | null | undefined) => void;
};

const defaultValue: DelegatedClaimsInterface = {
    claimsRef: { current: undefined },
    subscribe: () => {
        return () => {};
    },
    setClaims: () => {}
};

const DelegatedClaimsContext = createContext<DelegatedClaimsInterface>(defaultValue);

export const DelegatedClaimsProvider = ({ children }: PropsWithChildren) => {
    const claimsRef = useRef<DelegatedClaims>({});
    const subscribers = useRef(new Set<Subscriber<DelegatedClaims>>());

    const subscribe = useCallback((subscriber: Subscriber<DelegatedClaims>) => {
        subscribers.current.add(subscriber);
        subscriber(claimsRef.current);

        return () => {
            subscribers.current.delete(subscriber);
        };
    }, []);

    const setClaims = useCallback((newClaims: DelegatedClaims | null | undefined) => {
        claimsRef.current = newClaims || {};
        subscribers.current.forEach((subscriber) => {
            subscriber(claimsRef.current);
        });
    }, []);

    const value = useMemo(
        () => ({
            claimsRef,
            subscribe,
            setClaims
        }),
        []
    );

    return <DelegatedClaimsContext.Provider value={value}>{children}</DelegatedClaimsContext.Provider>;
};

export const useDelegatedClaims = () => {
    return useContext(DelegatedClaimsContext);
};

export const useDelegatedClaimsSubscriber = () => {
    const { subscribe, claimsRef } = useContext(DelegatedClaimsContext);
    const [claims, setClaims] = useState(claimsRef.current ?? {});

    useEffect(() => subscribe(setClaims), []);

    return claims;
};
