interface UnknownKeys {
  [key: string]: boolean | string | number | observableType[] | UnknownKeys;
}

type observableType = boolean | string | number | observableType[] | UnknownKeys;

export = observableType;