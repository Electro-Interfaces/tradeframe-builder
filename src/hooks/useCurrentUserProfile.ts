import { useQuery } from '@tanstack/react-query';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { externalUsersService } from '@/services/externalUsersService';
import type { User } from '@/types/auth';

/**
 * Хук для загрузки актуальных данных профиля текущего пользователя из внешней БД
 */
export const useCurrentUserProfile = () => {
  const { user: authUser } = useNewAuth();

  return useQuery<User | null>({
    queryKey: ['currentUserProfile', authUser?.email],
    queryFn: async () => {
      if (!authUser?.email) {
        return null;
      }

      try {
        // Загружаем пользователя из внешней БД по email
        const externalUser = await externalUsersService.getUserByEmail(authUser.email);

        if (externalUser) {
          return externalUser;
        } else {
          return null;
        }
      } catch (error) {
        console.error('useCurrentUserProfile: Ошибка загрузки профиля:', error);
        throw error;
      }
    },
    enabled: !!authUser?.email,
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
  });
};