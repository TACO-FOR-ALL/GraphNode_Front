export type Me = {
  userId: string;
  profile: UserProfile;
};

export type UserProfile = {
  id: string;
  avatarUrl: string;
  displayName: string;
  email: string;
};
