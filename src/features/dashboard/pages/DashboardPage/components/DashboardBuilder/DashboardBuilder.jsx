import "./DashboardBuilder.css";
import { useEffect, useMemo, useState } from "react";
import ReactGridLayout, { useContainerWidth } from "react-grid-layout";
import { FiEdit3, FiPlus, FiSave, FiX, FiRotateCcw, FiLock } from "react-icons/fi";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { widgetRegistry, createDefaultDashboard } from "../../../../config/widgetRegistry.js";
import { useDashboardLayout } from "../../../../hooks/useDashboardLayout.js";
import { DashboardWidget } from "../DashboardWidgets/DashboardWidgets.jsx";

const clone = (value) => JSON.parse(JSON.stringify(value));
const supported = (widgets) => (widgets ?? []).filter((widget) => widgetRegistry[widget.type]);

export function DashboardBuilder({ tenantId, canEdit, summary, activities }) {
  const { definition, widgetData, save } = useDashboardLayout(tenantId);
  const [draft, setDraft] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const { width, containerRef, mounted } = useContainerWidth();
  const isMobile = width < 800;
  const editable = Boolean(draft);
  const current = draft ?? definition.data;
  const widgets = useMemo(() => supported(current?.widgets), [current]);
  const layout = useMemo(() => widgets.map((w) => w.layout), [widgets]);

  // Chuyển tenant phải xóa draft; tuyệt đối không đem layout tenant A sang tenant B.
  useEffect(() => {
    setDraft(null);
    setPaletteOpen(false);
    setNotice("");
  }, [tenantId]);

  const begin = () => { if (canEdit && definition.data) { setDraft(clone(definition.data)); setNotice(""); } };
  const cancel = () => { setDraft(null); setPaletteOpen(false); setNotice(""); };
  const onLayoutChange = (nextLayout) => {
    if (!editable || isMobile) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const byId = new Map(nextLayout.map((item) => [item.i, item]));
      let changed = false;
      const nextWidgets = prev.widgets.map((w) => {
        const next = byId.get(w.id);
        if (!next) return w;
        const { x, y, w: gridW, h: gridH } = next;
        if (x === w.layout.x && y === w.layout.y && gridW === w.layout.w && gridH === w.layout.h) return w;
        changed = true;
        return { ...w, layout: { ...w.layout, x, y, w: gridW, h: gridH } };
      });
      return changed ? { ...prev, widgets: nextWidgets } : prev;
    });
  };
  const addWidget = (type) => {
    const spec = widgetRegistry[type];
    if (!spec) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const lastRow = Math.max(0, ...prev.widgets.map((w) => w.layout.y + w.layout.h));
      const id = `widget-${crypto.randomUUID()}`;
      const widget = { id, type, title: spec.title, config: {}, layout: {
        i: id, x: 0, y: lastRow, w: spec.size.w, h: spec.size.h, minW: spec.minW, minH: spec.minH,
      } };
      return { ...prev, widgets: [...prev.widgets, widget] };
    });
    setPaletteOpen(false);
  };
  const removeWidget = (id) => setDraft((prev) => prev ? { ...prev, widgets: prev.widgets.filter((w) => w.id !== id) } : prev);
  const reset = () => setDraft((prev) => prev ? { ...createDefaultDashboard(tenantId), revision: prev.revision } : prev);
  const persist = async () => {
    if (!draft || isMobile) return;
    try { await save.mutateAsync(draft); setDraft(null); setPaletteOpen(false); setNotice("Đã lưu Dashboard cho tenant hiện tại."); }
    catch (error) { setNotice(error?.response?.data?.message || error.message || "Lưu thất bại."); }
  };

  if (!tenantId) return <p className="wb-subtext">Chọn tenant để xem Dashboard.</p>;
  if (definition.isLoading) return <p className="wb-subtext">Đang tải bố cục Dashboard...</p>;
  if (definition.isError) return <p role="alert" className="wb-error">Không tải được layout: {definition.error.message}</p>;

  return <section className="dashboard-builder" aria-label="Dashboard tùy chỉnh">
    <div className="wb-toolbar">
      <div><span className="wb-eyebrow">DASHBOARD TÙY CHỈNH</span><h2>{current?.name || "Dashboard"}</h2>
        <p className="wb-subtext">{editable ? "Kéo ở đầu widget, kéo góc dưới phải để resize. Nhấn Lưu để áp dụng." : "Bố cục được lưu riêng cho từng tenant."}</p>
      </div>
      <div className="wb-actions">
        {editable ? <>
          <button className="wb-btn wb-btn-neutral" onClick={() => setPaletteOpen((v) => !v)}><FiPlus /> Thêm widget</button>
          <button className="wb-btn wb-btn-neutral" onClick={reset}><FiRotateCcw /> Mặc định</button>
          <button className="wb-btn wb-btn-neutral" onClick={cancel}><FiX /> Hủy</button>
          <button className="wb-btn wb-btn-primary" disabled={save.isPending || isMobile} onClick={persist}><FiSave /> {save.isPending ? "Đang lưu" : "Lưu bố cục"}</button>
        </> : canEdit ? <button className="wb-btn wb-btn-primary" onClick={begin}><FiEdit3 /> Chỉnh sửa Dashboard</button> : <span className="wb-readonly"><FiLock /> Bạn có quyền xem Dashboard</span>}
      </div>
    </div>
    {notice && <p className="wb-notice" role="status">{notice}</p>}
    {editable && isMobile && <p className="wb-notice">Chế độ kéo thả cần màn hình rộng tối thiểu 800px. Bạn vẫn có thể xem Dashboard trên điện thoại.</p>}
    {editable && paletteOpen && <div className="wb-palette" aria-label="Thư viện widget">
      <div className="wb-palette-header"><strong>Thư viện widget</strong><button type="button" onClick={() => setPaletteOpen(false)} aria-label="Đóng">×</button></div>
      <div className="wb-palette-items">{Object.entries(widgetRegistry).map(([type, info]) => {
        const Icon = info.icon;
        return <button key={type} type="button" className="wb-palette-item" onClick={() => addWidget(type)}><Icon size={19} /><span>{info.title}</span><FiPlus /></button>;
      })}</div>
    </div>}
    {widgetData.isError && <p className="wb-error" role="alert">Không tải được dữ liệu widget.</p>}
    <div className={editable ? "wb-grid-container wb-grid-editing" : "wb-grid-container"} ref={containerRef}>
      {isMobile ? <div className="wb-mobile-grid">{widgets.map((w) => <div key={w.id} style={{ minHeight: w.type.startsWith("kpi.") ? 160 : 290 }}><DashboardWidget widget={w} summary={summary} activities={activities} data={widgetData.data} editable={false} /></div>)}</div>
        : mounted && <ReactGridLayout
            layout={layout} width={width}
            gridConfig={{ cols: 12, rowHeight: 58, margin: [14, 14], containerPadding: [0, 0] }}
            dragConfig={{ enabled: editable && canEdit, handle: ".wb-widget-handle", cancel: "button" }}
            resizeConfig={{ enabled: editable && canEdit, handles: ["se"] }}
            onLayoutChange={onLayoutChange}
          >
          {widgets.map((w) => <div key={w.id}><DashboardWidget widget={w} editable={editable && canEdit} onRemove={removeWidget} summary={summary} activities={activities} data={widgetData.data} /></div>)}
        </ReactGridLayout>}
    </div>
  </section>;
}
