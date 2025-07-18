export interface AppConfig {
    classNames: { [className: string]: string };
    keybinds: { [key: string]: string };
    defaults: {
        annotationColor: string;
        annotationOpacity: number;
        strokeWidth: number;
    };
}

export const DEFAULT_CONFIG: AppConfig = {
    classNames: {
        'tile': '#32CD32',
    },
    keybinds: {
        'r': 'Rectangle',
        'p': 'Pan',
        'w': 'Selector'
    },
    defaults: {
        annotationColor: '#32CD32',
        annotationOpacity: 0.7,
        strokeWidth: 2,
    }
};

export class ConfigManager {
    private config: AppConfig;
    private updateCallback?: (config: AppConfig) => void;

    constructor(initialConfig: AppConfig = DEFAULT_CONFIG, updateCallback?: (config: AppConfig) => void) {
        this.config = { ...initialConfig };
        this.updateCallback = updateCallback;
    }

    // Get the entire config
    getConfig(): AppConfig {
        return { ...this.config };
    }

    // Update the entire config
    setConfig(newConfig: AppConfig): void {
        this.config = { ...newConfig };
        this.notifyUpdate();
    }

    // Class names management
    getClassNames(): { [className: string]: string } {
        return { ...this.config.classNames };
    }

    setClassNames(classNames: { [className: string]: string }): void {
        this.config.classNames = classNames;
        this.notifyUpdate();
    }

    updateClassColor(className: string, color: string): void {
        if (this.config.classNames.hasOwnProperty(className)) {
            this.config.classNames[className] = color;
            this.notifyUpdate();
        }
    }

    getClassColor(className: string): string {
        if (this.config.classNames[className]) {
            return this.config.classNames[className];
        }

        return '#FF0000';
    }

    // Keybinds management
    getKeybinds(): { [key: string]: string } {
        return { ...this.config.keybinds };
    }

    setKeybind(key: string, toolName: string): void {
        this.config.keybinds[key] = toolName;
        this.notifyUpdate();
    }

    removeKeybind(key: string): void {
        delete this.config.keybinds[key];
        this.notifyUpdate();
    }

    // Defaults management
    getDefaults() {
        return { ...this.config.defaults };
    }

    setDefault<K extends keyof AppConfig['defaults']>(key: K, value: AppConfig['defaults'][K]): void {
        this.config.defaults[key] = value;
        this.notifyUpdate();
    }

    // Persistence methods (for future use with localStorage)
    saveToStorage(): void {
        try {
            localStorage.setItem('aknote-config', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Failed to save config to localStorage:', error);
        }
    }

    loadFromStorage(): boolean {
        try {
            const stored = localStorage.getItem('aknote-config');
            if (stored) {
                const parsedConfig = JSON.parse(stored);
                this.config = { ...DEFAULT_CONFIG, ...parsedConfig };
                this.notifyUpdate();
                return true;
            }
        } catch (error) {
            console.warn('Failed to load config from localStorage:', error);
        }
        return false;
    }

    private notifyUpdate(): void {
        if (this.updateCallback) {
            this.updateCallback(this.getConfig());
        }
    }
}
