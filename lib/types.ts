/** Estado devuelto por los Server Actions que se usan con useActionState. */
export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export const initialActionState: ActionState = {};
