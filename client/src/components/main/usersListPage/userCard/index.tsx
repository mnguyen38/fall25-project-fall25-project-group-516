import { PopulatedSafeDatabaseUser } from '../../../../types/types';
import { Box, Text, HStack, VStack, Avatar } from '@chakra-ui/react';

interface UserProps {
  user: PopulatedSafeDatabaseUser;
  handleUserCardViewClickHandler: (user: PopulatedSafeDatabaseUser) => void;
}

const UserCardView = ({ user, handleUserCardViewClickHandler }: UserProps) => {
  return (
    <Box
      onClick={() => handleUserCardViewClickHandler(user)}
      bg='var(--pancake-white)'
      border='1px solid var(--pancake-border)'
      borderRadius='2xl'
      padding='var(--spacing-md)'
      cursor='pointer'
      transition='all 0.2s ease'
      height='100%'
      _hover={{
        borderColor: 'var(--pancake-brown-light)',
        boxShadow: 'var(--shadow-md)',
        transform: 'scale(1.02)',
        bg: 'var(--pancake-cream-light)',
      }}>
      <HStack gap={4}>
        <Avatar.Root
          size='md'
          borderRadius='full'
          overflow='hidden'
          bg='var(--pancake-brown-dark)'
          padding='0'
          display='flex'
          alignItems='center'
          justifyContent='center'>
          <Avatar.Fallback color='white' fontWeight='bold' fontSize='sm' padding='0'>
            {user.username.substring(0, 2).toUpperCase()}
          </Avatar.Fallback>

          {user.profilePicture && (
            <Avatar.Image src={user.profilePicture} objectFit='cover' width='100%' height='100%' />
          )}
        </Avatar.Root>

        <VStack align='start' gap={0}>
          <Text fontWeight='700' color='var(--pancake-brown-dark)' fontSize='md' lineHeight='1.2'>
            {user.username}
          </Text>
          <Text fontSize='xs' color='var(--pancake-text-medium)' fontWeight='500'>
            Joined {new Date(user.dateJoined).toLocaleDateString()}
          </Text>
        </VStack>
      </HStack>
    </Box>
  );
};

export default UserCardView;
