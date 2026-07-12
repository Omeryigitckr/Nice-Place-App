export interface SavedCollection {
  id: string;
  name: string;
  description: string | null;
  coverPhotoUrl: string | null;
  placeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedCollectionMembership {
  collectionId: string;
  placeId: string;
}
