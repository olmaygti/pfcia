import ApplicationContext from '../applicationContext.js';

const uncapitalize = (str) => `${str[0].toLowerCase()}${str.slice(1)}`;

function Bean(props = {}) {
    return (target, key, descriptor) => {
        props.scope = props.scope || Bean.SCOPES.SINGLETON;
        props.target = target;
        let metadataDestination = target[key];
        if (!descriptor) {
            // Class level default bean constructor if not provided
            const beanConstructor = props.beanConstructor || async function builder(appContext, event, dependencies = []) {
                const Target = target;
                return new Target(...dependencies);
            };
            metadataDestination = beanConstructor;
            ApplicationContext.constructors[props.beanName || uncapitalize(target.name)] = beanConstructor;
        }
        Object.assign(metadataDestination, props);
    };
}

Bean.SCOPES = {
    PROTOTYPE: 'PROTOTYPE',
    SINGLETON: 'SINGLETON',
};

export default Bean;
