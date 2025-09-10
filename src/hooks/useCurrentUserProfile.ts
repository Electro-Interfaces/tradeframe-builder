import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { externalUsersService } from '@/services/externalUsersService';
import type { User } from '@/types/auth';

/**
 * Хук для загрузки актуальных данных профиля текущего пользователя из внешней БД
 */
export const useCurrentUserProfile = () => {
  const { user: authUser } = useAuth();
  
  console.log('useCurrentUserProfile: Хук инициализирован, authUser:', authUser);
  
  return useQuery<User | null>({
    queryKey: ['currentUserProfile', authUser?.email],
    queryFn: async () => {
      console.log('useCurrentUserProfile: Запускается queryFn для email:', authUser?.email);
      
      if (!authUser?.email) {
        console.log('useCurrentUserProfile: email отсутствует, возвращаем null');
        return null;
      }
      
      console.log('useCurrentUserProfile: Загружаем профиль пользователя:', authUser.email);
      
      try {
        // Загружаем пользователя из внешней БД по email
        const externalUser = await externalUsersService.getUserByEmail(authUser.email);
        
        if (externalUser) {
          console.log('useCurrentUserProfile: Найден пользователь в внешней БД:', externalUser);
          return externalUser;
        } else {
          console.log('useCurrentUserProfile: Пользователь не найден во внешней БД');
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