/**
 * Service Registry for managing disposable services
 * This allows for centralized cleanup on application exit
 */
export interface IDisposable {
    dispose(): void;
}

class ServiceRegistry {
    private static instance: ServiceRegistry;
    private disposableServices: Set<IDisposable> = new Set();

    private constructor() {}

    public static getInstance(): ServiceRegistry {
        if (!ServiceRegistry.instance) {
            ServiceRegistry.instance = new ServiceRegistry();
        }
        return ServiceRegistry.instance;
    }

    /**
     * Register a disposable service
     * @param service The service implementing IDisposable
     */
    public register(service: IDisposable): void {
        this.disposableServices.add(service);
        console.log(`Registered disposable service: ${service.constructor.name}`);
    }

    /**
     * Unregister a disposable service
     * @param service The service to unregister
     */
    public unregister(service: IDisposable): void {
        this.disposableServices.delete(service);
        console.log(`Unregistered disposable service: ${service.constructor.name}`);
    }

    /**
     * Dispose all registered services
     */
    public disposeAll(): void {
        console.log('Disposing all registered services...');
        const errors: { service: string; error: any }[] = [];
        
        for (const service of this.disposableServices) {
            try {
                service.dispose();
                console.log(`Disposed: ${service.constructor.name}`);
            } catch (error) {
                errors.push({
                    service: service.constructor.name,
                    error
                });
                console.error(`Error disposing ${service.constructor.name}:`, error);
            }
        }
        
        this.disposableServices.clear();
        
        if (errors.length > 0) {
            console.error(`${errors.length} error(s) occurred during cleanup`);
        }
    }

    /**
     * Get the count of registered services
     */
    public getCount(): number {
        return this.disposableServices.size;
    }
}

// Export singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();

// Re-export for convenience
export { ServiceRegistry };
