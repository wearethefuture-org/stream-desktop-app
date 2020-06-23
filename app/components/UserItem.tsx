import React from 'react';
import User from '../model/User';
import { ListItem, ListItemText } from '@material-ui/core';

type UserItemProps = {
  user: User,
  onClick: (user: User) => void,
  isSelected: boolean
}

const UserItem: React.FC<UserItemProps> = ({ user, onClick, isSelected }) => {
  return (
    <ListItem button selected={isSelected} onClick={() => onClick(user)}>
      <ListItemText primary={user.staticData.deviceInfo.name} />
    </ListItem>
  );
};

export default UserItem;
