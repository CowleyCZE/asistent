/**
 * Lightweight Dependency Injection container
 * Podpora singleton a transient registrací s lazy vytvářením instancí.
 */
export interface DIRegistration<T> {
    factory: (container: DIContainer) => T;
    singleton: boolean;
}

export class DIContainer {
    private registrations = new Map<string, DIRegistration<any>>();
    private instances = new Map<string, any>();

    /**
     * Zaregistruje factory pod daným tokenem.
     * @param token Unikátní klíč služby
     * @param factory Funkce vytvářející instanci
     * @param singleton Pokud true, instance se cachuje
     */
    public register<T>(token: string, factory: (container: DIContainer) => T, singleton: boolean = true): void {
        if (this.registrations.has(token)) {
            throw new Error(`Service "${token}" is already registered`);
        }
        this.registrations.set(token, { factory, singleton });
    }

    /**
     * Přepíše existující registraci (užitečné v testech).
     */
    public override<T>(token: string, factory: (container: DIContainer) => T, singleton: boolean = true): void {
        this.registrations.set(token, { factory, singleton });
        this.instances.delete(token);
    }

    /**
     * Vyřeší instanci služby podle tokenu.
     */
    public resolve<T>(token: string): T {
        const registration = this.registrations.get(token);
        if (!registration) {
            throw new Error(`Service "${token}" is not registered`);
        }
        if (registration.singleton) {
            if (!this.instances.has(token)) {
                this.instances.set(token, registration.factory(this));
            }
            return this.instances.get(token) as T;
        }
        return registration.factory(this) as T;
    }

    /**
     * Zjistí, zda je token zaregistrován.
     */
    public has(token: string): boolean {
        return this.registrations.has(token);
    }

    /**
     * Zruší registraci a uvolní cached instanci.
     */
    public unregister(token: string): void {
        this.registrations.delete(token);
        this.instances.delete(token);
    }

    /**
     * Vyčistí všechny registrace a instance.
     */
    public clear(): void {
        this.registrations.clear();
        this.instances.clear();
    }
}
