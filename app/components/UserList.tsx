import { List } from "@material-ui/core";
import React from "react";
import UserItem from "./UserItem";
import User from '../model/User';

type UserListProps = {
  users: User[],
  onUserSelected: (user: User) => void,
  selected: number
};

const UserList: React.FC<UserListProps> = ({ users, onUserSelected, selected }) => {
  return (
    <List>
      {users.map((value, index) => (
        <UserItem
          key={index}
          user={value}
          onClick={onUserSelected}
          isSelected={selected === index}
        />
      ))}
    </List>
  );
};

export default UserList;
