export interface Cliente {
    id: number;
    nombre: string;
    email?: string | null;
    telefono: string;
    comentarios?: string | null;
    createdAt: string;
    updatedAt: string;
}
