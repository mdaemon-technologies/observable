interface UnknownKeys {
  [key: string]: boolean | string | number | observableType[] | UnknownKeys;
}

type observableType = boolean | string | number | observableType[] | UnknownKeys;

type ObserverCallback = (newValue: observableType, oldValue: observableType | undefined) => void;

type ObservableFunction = {
  (): observableType;
  (newValue: ObserverCallback): () => void;
  (newValue: observableType | string): boolean | void;
};

export default function observe(name: string, initialValue?: observableType): ObservableFunction;
export { observableType, UnknownKeys, ObserverCallback, ObservableFunction };