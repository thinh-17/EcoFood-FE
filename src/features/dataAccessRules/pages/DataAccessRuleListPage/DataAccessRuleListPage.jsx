import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CoreButton, CoreCard, CoreModal, CorePageHeader, CoreTable, useDisclosure } from "@thinh-17/fe-core";

import { ROUTES } from "../../../../constants/routes.js";
import { useDataAccessRuleDetail } from "../../hooks/useDataAccessRuleDetail.js";
import { useDataAccessRuleDirectory } from "../../hooks/useDataAccessRuleDirectory.js";
import { DataAccessRuleDetailForm } from "./DataAccessRuleDetailForm.jsx";
import "./DataAccessRuleListPage.css";

const PAGE_SIZE = 20;

const COLUMNS = [
  { accessorKey: "ruleName", header: "Rule Name", meta: { sortable: true, sortField: "name" } },
  { accessorKey: "code", header: "Code" },
  { accessorKey: "businessEntityName", header: "Business Entity" },
  { accessorKey: "accessLevel", header: "Access Level" },
];

/** Mirrors TenantListPage's directory + row-click detail pattern exactly. */
export function DataAccessRuleListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ field: "updatedAt", direction: "desc" });
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState(null);

  const { data, isLoading, isError, error } = useDataAccessRuleDirectory({
    page,
    size: PAGE_SIZE,
    sort: `${sort.field},${sort.direction}`,
    search,
    hasSearched,
  });

  const detailModal = useDisclosure(false);
  const { data: ruleDetail, isLoading: isDetailLoading, isError: isDetailError } = useDataAccessRuleDetail(selectedRuleId);

  const columns = useMemo(() => COLUMNS, []);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setHasSearched(true);
    setPage(0);
  }

  function handleSortChange(nextSort) {
    setSort(nextSort);
    setPage(0);
  }

  function handleRowClick(rule) {
    setSelectedRuleId(rule.id);
    detailModal.open();
  }

  return (
    <div className="eco-module-page data-access-rule-list-page">
      <CorePageHeader
        eyebrow="EcoFood Platform"
        title="Data Access Rules"
        description="Define what transaction data is accessible and which users are allowed to access it."
        aside={<CoreButton onClick={() => navigate(ROUTES.DATA_ACCESS_RULE_NEW)}>+ Create New</CoreButton>}
      />

      {isError && (
        <p className="data-access-rule-list__error" role="alert">
          {error?.response?.data?.message || "Failed to load data access rules."}
        </p>
      )}

      <CoreCard>
        <input
          type="search"
          className="fe-input data-access-rule-list__search"
          placeholder="Search rules by name..."
          value={search}
          onChange={handleSearchChange}
        />

        <CoreTable
          columns={columns}
          data={data?.content ?? []}
          loading={isLoading}
          page={data?.page ?? page}
          pageSize={data?.size ?? PAGE_SIZE}
          totalElements={data?.totalElements ?? 0}
          sort={sort}
          onSortChange={handleSortChange}
          onPageChange={setPage}
          onRowClick={handleRowClick}
          emptyTitle="No data access rules yet"
          emptyDescription="Create one to start scoping which users can see which tenant data."
        />
      </CoreCard>

      <CoreModal isOpen={detailModal.isOpen} onClose={detailModal.close} title="Edit Data Access Rule" size="lg">
        {isDetailLoading && <p>Loading…</p>}

        {isDetailError && <p className="data-access-rule-list__error">Failed to load rule detail.</p>}

        {ruleDetail && (
          <DataAccessRuleDetailForm
            key={ruleDetail.id}
            rule={ruleDetail}
            onCancel={detailModal.close}
            onSaved={detailModal.close}
          />
        )}
      </CoreModal>
    </div>
  );
}
