
export class CreateWorkspaceDto {
     name: string;
     location?: string;
     createdBy: string; // user ID of the creator (used for audit logs)
   }
   