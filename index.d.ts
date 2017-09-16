declare module 'blockml-component' {
  interface Component {
    create: ()=>void;
    render: (props: {}, children: string)=>string;
  }

  declare function component<T extends Component>(name: string, obj: T): T;
}