export async function compensateFailedPartnerRegistration(input: {
  createdNewAuthUser: boolean;
  userId: string;
  deleteAuthUser: (userId: string) => Promise<boolean>;
}): Promise<{ compensated: boolean; recoveryRequired: boolean }> {
  if (!input.createdNewAuthUser) {
    return { compensated: false, recoveryRequired: false };
  }
  const compensated = await input.deleteAuthUser(input.userId).catch(() => false);
  return { compensated, recoveryRequired: !compensated };
}
