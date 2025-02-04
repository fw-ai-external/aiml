import { ReactTagNodeDefinition } from "~/new/elements/createTagNodeDefinition";
import type { intrinsicSCXMLNodes } from "~/new/elements/scxml";
// import("/Users/mattapperson/Development/fireworks/frontend/node_modules/@types/react/jsx-runtime").JSX.Element
declare module "react" {
  namespace JSX {
    type ElementType = string | typeof TagNodeDefinition;

    type Element =
      | React.ReactElement<any, any>
      | React.Component
      | ReactTagNodeDefinition
      | FireAgentNode
      | JSX.Element
      | JSX.Element[]
      | Element[];
    interface IntrinsicElements
      extends KeysToLowercase<typeof intrinsicSCXMLNodes> {}
  }

  interface ScriptHTMLAttributes<T> extends React.HTMLAttributes<T> {
    language?: string; // Make language optional
  }

  interface DataHTMLAttributes<T> extends React.HTMLAttributes<T> {
    expr?: string; // Make expr optional
  }
}

type KeysToLowercase<T> = {
  [K in keyof T as Lowercase<
    K extends `${infer Base}Element` ? Base : K
  >]: InstanceType<T[K]>["propsType"];
};

export type Element =
  | React.ReactElement<any, any>
  | React.Component
  | ReactTagNodeDefinition
  | FireAgentNode
  | JSX.Element
  | JSX.Element[]
  | Element[];
