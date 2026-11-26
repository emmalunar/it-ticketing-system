import type { FormEvent } from "react";
import type { AdminUserInput, ManagedUser, TicketOptions } from "@/lib/api";

export type NewStationInput = {
  name: string;
  code: string;
  description: string;
};

export type OfficerStationTransferInput = {
  officer: string;
  from_station: string;
  to_station: string;
};

export type IssueTypeInput = {
  name: string;
  category_name: string;
  description: string;
};

export type AdminPeopleProps = {
  users: ManagedUser[];
  filteredUsers: ManagedUser[];
  stations: TicketOptions["stations"];
  loading: boolean;
  working: boolean;
  currentUserId: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  formOpen: boolean;
  editingUser: ManagedUser | null;
  userForm: AdminUserInput;
  onUserFormChange: (form: AdminUserInput) => void;
  onOpenCreate: () => void;
  onOpenEdit: (user: ManagedUser) => void;
  onCloseForm: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleActive: (user: ManagedUser) => void;
};

export type AdminSetupProps = {
  options: TicketOptions | null;
  users: ManagedUser[];
  serviceOfficers: ManagedUser[];
  working: boolean;
  newStation: NewStationInput;
  onNewStationChange: (value: NewStationInput) => void;
  onCreateStation: (event: FormEvent<HTMLFormElement>) => void;
  officerTransfer: OfficerStationTransferInput;
  onOfficerTransferChange: (value: OfficerStationTransferInput) => void;
  onTransferOfficer: (event: FormEvent<HTMLFormElement>) => void;
  issueTypeForm: IssueTypeInput;
  onIssueTypeFormChange: (value: IssueTypeInput) => void;
  onSubmitIssueType: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveIssueType: (issueTypeId: string) => void;
  onReactivateIssueType: (issueTypeId: string) => void;
};
