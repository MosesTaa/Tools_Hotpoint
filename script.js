"use strict";

/* =========================================================
   HOTPOINT TOOLS TRACKER
   ========================================================= */

const STORAGE_KEY = "hotpointToolsTrackerV1";
const ADMIN_USER = "ADMIN";
const ADMIN_PASSWORD = "Hotpoint_tools";

/* =========================================================
   DEFAULT TOOLS
   ========================================================= */

const seedTools = [
    {
        name: "Ladders",
        quantity: 2,
        description:
            "Access ladders for installation and service work."
    },
    {
        name: "Flaring Kit",
        quantity: 2,
        description:
            "Copper pipe flaring tools and accessories."
    },
    {
        name: "Oxy/Acetylene Gauge",
        quantity: 1,
        description:
            "Gauge set for controlled oxy-acetylene work."
    },
    {
        name: "Grinder",
        quantity: 2,
        description:
            "Portable angle grinder for workshop and site tasks."
    },
    {
        name: "Scaffolding",
        quantity: 1,
        description:
            "Mobile scaffolding set for elevated work."
    }
];

/* =========================================================
   GENERAL FUNCTIONS
   ========================================================= */

function uid() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8)
    );
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function prettyDate(value) {
    if (!value) {
        return "—";
    }

    return new Date(
        `${value}T00:00:00`
    ).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(
        /[&<>'"]/g,
        character => {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            }[character];
        }
    );
}

/* =========================================================
   STORAGE
   ========================================================= */

function normalizeData(data) {
    data.tools.forEach(tool => {
        tool.assignments.forEach(assignment => {
            assignment.site =
                assignment.site || "Not recorded";

            assignment.action =
                assignment.action || "Assigned";
        });
    });

    data.history.forEach(record => {
        record.site =
            record.site || "Not recorded";

        record.action =
            record.action || "Assigned";
    });

    return data;
}

function loadData() {
    try {
        const savedData = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        );

        if (
            savedData &&
            Array.isArray(savedData.tools) &&
            Array.isArray(savedData.history)
        ) {
            return normalizeData(savedData);
        }
    } catch (error) {
        console.error(
            "Unable to load saved tool records:",
            error
        );
    }

    const initialData = {
        tools: seedTools.map(tool => ({
            ...tool,
            id: uid(),
            assignments: []
        })),

        history: []
    };

    saveData(initialData);

    return initialData;
}

function saveData(data) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );

    window.dispatchEvent(
        new Event("tracker-updated")
    );
}

function available(tool) {
    return Math.max(
        0,
        tool.quantity - tool.assignments.length
    );
}

function statusChip(text, type) {
    return `
        <span class="status ${type}">
            ${escapeHTML(text)}
        </span>
    `;
}

/* =========================================================
   REQUEST TOOL PAGE
   ========================================================= */

function initRequest() {
    const searchInput =
        document.querySelector("#toolSearch");

    const historyFilter =
        document.querySelector("#historyFilter");

    function renderRequestPage() {
        const data = loadData();

        const searchText = searchInput.value
            .trim()
            .toLowerCase();

        const displayedTools = data.tools.filter(tool => {
            const assignments = tool.assignments
                .map(assignment => {
                    return `
                        ${assignment.technician}
                        ${assignment.site}
                    `;
                })
                .join(" ");

            const searchableText = `
                ${tool.name}
                ${tool.description}
                ${assignments}
            `.toLowerCase();

            return searchableText.includes(searchText);
        });

        renderSummary(data);
        renderTools(displayedTools);
        renderTechnicianFilter(data);
        renderHistory(data);
    }

    function renderSummary(data) {
        const totalUnits = data.tools.reduce(
            (total, tool) => {
                return total + tool.quantity;
            },
            0
        );

        const availableUnits = data.tools.reduce(
            (total, tool) => {
                return total + available(tool);
            },
            0
        );

        const allocatedUnits = data.tools.reduce(
            (total, tool) => {
                return total + tool.assignments.length;
            },
            0
        );

        document.querySelector(
            "#totalUnits"
        ).textContent = totalUnits;

        document.querySelector(
            "#availableUnits"
        ).textContent = availableUnits;

        document.querySelector(
            "#allocatedUnits"
        ).textContent = allocatedUnits;
    }

    function renderTools(tools) {
        const toolGrid =
            document.querySelector("#toolGrid");

        toolGrid.innerHTML = tools
            .map(tool => {
                const freeUnits = available(tool);

                const status =
                    freeUnits > 0
                        ? statusChip(
                            "AVAILABLE",
                            "free"
                        )
                        : statusChip(
                            "FULLY ALLOCATED",
                            "busy"
                        );

                const allocationList =
                    tool.assignments.length > 0
                        ? `
                            <div class="assignments">
                                ${tool.assignments
                                    .map(assignment => {
                                        return `
                                            <div class="assignment-line">
                                                <span class="assignment-person">
                                                    <strong>
                                                        ${escapeHTML(
                                                            assignment.technician
                                                        )}
                                                    </strong>

                                                    <small>
                                                        ${escapeHTML(
                                                            assignment.site
                                                        )}
                                                    </small>
                                                </span>

                                                <span>
                                                    ${prettyDate(
                                                        assignment.assignedDate
                                                    )}
                                                </span>
                                            </div>
                                        `;
                                    })
                                    .join("")}
                            </div>
                        `
                        : "";

                return `
                    <article class="tool-card">
                        <div class="tool-title">
                            <h2>
                                ${escapeHTML(tool.name)}
                            </h2>

                            ${status}
                        </div>

                        <p class="description">
                            ${escapeHTML(tool.description)}
                        </p>

                        <div class="availability">
                            <div>
                                <span>Total</span>
                                <strong>
                                    ${tool.quantity}
                                </strong>
                            </div>

                            <div>
                                <span>Free</span>
                                <strong>
                                    ${freeUnits}
                                </strong>
                            </div>

                            <div>
                                <span>Out</span>
                                <strong>
                                    ${tool.assignments.length}
                                </strong>
                            </div>
                        </div>

                        ${allocationList}
                    </article>
                `;
            })
            .join("");

        document.querySelector(
            "#emptyTools"
        ).hidden = tools.length !== 0;
    }

    function renderTechnicianFilter(data) {
        const technicianNames = [
            ...new Set(
                data.history.map(record => {
                    return record.technician;
                })
            )
        ].sort();

        const selectedTechnician =
            historyFilter.value;

        historyFilter.innerHTML = `
            <option value="">
                All technicians
            </option>

            ${technicianNames
                .map(name => {
                    return `
                        <option
                            value="${escapeHTML(name)}"
                            ${
                                name === selectedTechnician
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${escapeHTML(name)}
                        </option>
                    `;
                })
                .join("")}
        `;
    }

    function renderHistory(data) {
        const selectedTechnician =
            historyFilter.value;

        const history = data.history
            .filter(record => {
                return (
                    !selectedTechnician ||
                    record.technician ===
                        selectedTechnician
                );
            })
            .sort((firstRecord, secondRecord) => {
                return secondRecord.assignedDate.localeCompare(
                    firstRecord.assignedDate
                );
            });

        document.querySelector(
            "#historyBody"
        ).innerHTML = history
            .map(record => {
                const status = record.releasedDate
                    ? statusChip(
                        "Released / transferred",
                        "free"
                    )
                    : statusChip(
                        "Allocated",
                        "busy"
                    );

                return `
                    <tr>
                        <td>
                            ${escapeHTML(record.technician)}
                        </td>

                        <td>
                            ${escapeHTML(record.site)}
                        </td>

                        <td>
                            ${escapeHTML(record.toolName)}
                        </td>

                        <td>
                            ${prettyDate(record.assignedDate)}
                        </td>

                        <td>
                            ${prettyDate(record.releasedDate)}
                        </td>

                        <td>
                            ${escapeHTML(record.action)}
                        </td>

                        <td>
                            ${status}
                        </td>
                    </tr>
                `;
            })
            .join("");

        document.querySelector(
            "#emptyHistory"
        ).hidden = history.length !== 0;
    }

    searchInput.addEventListener(
        "input",
        renderRequestPage
    );

    historyFilter.addEventListener(
        "change",
        renderRequestPage
    );

    window.addEventListener(
        "storage",
        renderRequestPage
    );

    window.addEventListener(
        "tracker-updated",
        renderRequestPage
    );

    renderRequestPage();
}

/* =========================================================
   ADMIN PAGE
   ========================================================= */

function initAdmin() {
    const loginPanel =
        document.querySelector("#loginPanel");

    const adminPanel =
        document.querySelector("#adminPanel");

    const assignedDateInput =
        document.querySelector("#assignedDate");

    const transferModal =
        document.querySelector("#transferModal");

    assignedDateInput.value = today();

    function showAdminPanel() {
        loginPanel.hidden = true;
        adminPanel.hidden = false;

        renderAdmin();
    }

    function closeTransferModal() {
        transferModal.hidden = true;

        document.body.classList.remove(
            "modal-open"
        );

        document
            .querySelector("#transferForm")
            .reset();
    }

    if (
        sessionStorage.getItem("hotpointAdmin") === "yes"
    ) {
        showAdminPanel();
    }

    /* ADMIN LOGIN */

    document
        .querySelector("#loginForm")
        .addEventListener("submit", event => {
            event.preventDefault();

            const username =
                document.querySelector(
                    "#username"
                ).value;

            const password =
                document.querySelector(
                    "#password"
                ).value;

            if (
                username !== ADMIN_USER ||
                password !== ADMIN_PASSWORD
            ) {
                document.querySelector(
                    "#loginError"
                ).textContent =
                    "Incorrect username or password.";

                return;
            }

            sessionStorage.setItem(
                "hotpointAdmin",
                "yes"
            );

            document.querySelector(
                "#loginError"
            ).textContent = "";

            showAdminPanel();
        });

    /* ADMIN LOGOUT */

    document
        .querySelector("#logoutBtn")
        .addEventListener("click", () => {
            sessionStorage.removeItem(
                "hotpointAdmin"
            );

            adminPanel.hidden = true;
            loginPanel.hidden = false;

            document.querySelector(
                "#password"
            ).value = "";
        });

    /* ADD TOOL */

    document
        .querySelector("#toolForm")
        .addEventListener("submit", event => {
            event.preventDefault();

            const data = loadData();

            const toolName =
                document.querySelector(
                    "#toolName"
                ).value.trim();

            const quantity = Number(
                document.querySelector(
                    "#toolQuantity"
                ).value
            );

            const description =
                document.querySelector(
                    "#toolDescription"
                ).value.trim();

            if (!toolName || !description) {
                alert(
                    "Enter the tool name and description."
                );

                return;
            }

            if (
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                alert(
                    "The quantity must be a whole number of at least 1."
                );

                return;
            }

            data.tools.push({
                id: uid(),
                name: toolName,
                quantity: quantity,
                description: description,
                assignments: []
            });

            saveData(data);

            event.target.reset();

            document.querySelector(
                "#toolQuantity"
            ).value = 1;

            renderAdmin();
        });

    /* ASSIGN TOOL */

    document
        .querySelector("#assignmentForm")
        .addEventListener("submit", event => {
            event.preventDefault();

            const data = loadData();

            const selectedToolId =
                document.querySelector(
                    "#assignTool"
                ).value;

            const technicianName =
                document.querySelector(
                    "#technicianName"
                ).value.trim();

            const siteName =
                document.querySelector(
                    "#siteName"
                ).value.trim();

            const assignedDate =
                assignedDateInput.value;

            const tool = data.tools.find(item => {
                return item.id === selectedToolId;
            });

            if (!tool || available(tool) < 1) {
                alert(
                    "The selected tool is not available."
                );

                return;
            }

            if (!technicianName) {
                alert(
                    "Enter the technician's name."
                );

                return;
            }

            if (!siteName) {
                alert(
                    "Enter the site name."
                );

                return;
            }

            if (!assignedDate) {
                alert(
                    "Select the date assigned."
                );

                return;
            }

            const allocationRecord = {
                id: uid(),
                toolId: tool.id,
                toolName: tool.name,
                technician: technicianName,
                site: siteName,
                assignedDate: assignedDate,
                releasedDate: "",
                action: "Assigned"
            };

            tool.assignments.push(
                allocationRecord
            );

            data.history.push({
                ...allocationRecord
            });

            saveData(data);

            event.target.reset();

            assignedDateInput.value = today();

            renderAdmin();
        });

    /* INVENTORY ACTIONS */

    document
        .querySelector("#adminInventory")
        .addEventListener("click", event => {
            const button = event.target.closest(
                "button[data-action]"
            );

            if (!button) {
                return;
            }

            const data = loadData();

            const tool = data.tools.find(item => {
                return item.id ===
                    button.dataset.tool;
            });

            if (!tool) {
                return;
            }

            const action = button.dataset.action;

            /* OPEN TRANSFER FORM */

            if (action === "transfer") {
                const assignment =
                    tool.assignments.find(item => {
                        return (
                            item.id ===
                            button.dataset.assignment
                        );
                    });

                if (!assignment) {
                    return;
                }

                document.querySelector(
                    "#transferToolId"
                ).value = tool.id;

                document.querySelector(
                    "#transferAssignmentId"
                ).value = assignment.id;

                document.querySelector(
                    "#transferDate"
                ).value = today();

                document.querySelector(
                    "#transferSummary"
                ).textContent =
                    `Transfer ${tool.name} from ` +
                    `${assignment.technician} at ` +
                    `${assignment.site}.`;

                transferModal.hidden = false;

                document.body.classList.add(
                    "modal-open"
                );

                document.querySelector(
                    "#transferTechnician"
                ).focus();

                return;
            }

            /* REMOVE TOOL */

            if (action === "remove") {
                if (tool.assignments.length > 0) {
                    alert(
                        "Release all allocated units before removing this tool."
                    );

                    return;
                }

                const shouldRemove = confirm(
                    `Remove ${tool.name} from inventory?`
                );

                if (!shouldRemove) {
                    return;
                }

                data.tools = data.tools.filter(item => {
                    return item.id !== tool.id;
                });
            }

            /* UPDATE QUANTITY */

            if (action === "save") {
                const quantityInput =
                    document.querySelector(
                        `[data-quantity="${tool.id}"]`
                    );

                const newQuantity =
                    Number(quantityInput.value);

                const minimumQuantity =
                    Math.max(
                        1,
                        tool.assignments.length
                    );

                if (
                    !Number.isInteger(newQuantity) ||
                    newQuantity < minimumQuantity
                ) {
                    alert(
                        `Quantity must be a whole number and cannot be below ${minimumQuantity}.`
                    );

                    quantityInput.value =
                        tool.quantity;

                    return;
                }

                tool.quantity = newQuantity;
            }

            /* RELEASE TOOL */

            if (action === "release") {
                const assignment =
                    tool.assignments.find(item => {
                        return (
                            item.id ===
                            button.dataset.assignment
                        );
                    });

                if (!assignment) {
                    return;
                }

                const shouldRelease = confirm(
                    `Release ${tool.name} from ${assignment.technician}?`
                );

                if (!shouldRelease) {
                    return;
                }

                tool.assignments =
                    tool.assignments.filter(item => {
                        return (
                            item.id !== assignment.id
                        );
                    });

                const historyRecord =
                    data.history.find(record => {
                        return (
                            record.id ===
                            assignment.id
                        );
                    });

                if (historyRecord) {
                    historyRecord.releasedDate =
                        today();

                    historyRecord.action =
                        "Released";
                }
            }

            saveData(data);
            renderAdmin();
        });

    /* CONFIRM TRANSFER */

    document
        .querySelector("#transferForm")
        .addEventListener("submit", event => {
            event.preventDefault();

            const data = loadData();

            const toolId =
                document.querySelector(
                    "#transferToolId"
                ).value;

            const oldAssignmentId =
                document.querySelector(
                    "#transferAssignmentId"
                ).value;

            const newTechnician =
                document.querySelector(
                    "#transferTechnician"
                ).value.trim();

            const newSite =
                document.querySelector(
                    "#transferSite"
                ).value.trim();

            const transferDate =
                document.querySelector(
                    "#transferDate"
                ).value;

            const tool = data.tools.find(item => {
                return item.id === toolId;
            });

            if (!tool) {
                alert("The selected tool was not found.");
                return;
            }

            const oldAssignment =
                tool.assignments.find(item => {
                    return item.id ===
                        oldAssignmentId;
                });

            if (!oldAssignment) {
                alert(
                    "The original allocation was not found."
                );

                return;
            }

            if (!newTechnician) {
                alert(
                    "Enter the new technician's name."
                );

                return;
            }

            if (!newSite) {
                alert(
                    "Enter the new site name."
                );

                return;
            }

            if (!transferDate) {
                alert(
                    "Select the transfer date."
                );

                return;
            }

            /*
             * Remove the old active allocation.
             */

            tool.assignments =
                tool.assignments.filter(item => {
                    return (
                        item.id !== oldAssignmentId
                    );
                });

            /*
             * Close the old technician's history record.
             */

            const oldHistoryRecord =
                data.history.find(record => {
                    return (
                        record.id ===
                        oldAssignmentId
                    );
                });

            if (oldHistoryRecord) {
                oldHistoryRecord.releasedDate =
                    transferDate;

                oldHistoryRecord.action =
                    `Transferred to ${newTechnician} — ${newSite}`;
            }

            /*
             * Create a new active allocation for the
             * receiving technician and site.
             */

            const newAssignment = {
                id: uid(),
                toolId: tool.id,
                toolName: tool.name,
                technician: newTechnician,
                site: newSite,
                assignedDate: transferDate,
                releasedDate: "",
                action:
                    `Transferred from ` +
                    `${oldAssignment.technician} — ` +
                    `${oldAssignment.site}`
            };

            tool.assignments.push(newAssignment);

            data.history.push({
                ...newAssignment
            });

            saveData(data);

            closeTransferModal();
            renderAdmin();
        });

    /* CLOSE TRANSFER FORM */

    transferModal.addEventListener(
        "click",
        event => {
            if (
                event.target.matches(
                    "[data-close-transfer]"
                )
            ) {
                closeTransferModal();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                !transferModal.hidden
            ) {
                closeTransferModal();
            }
        }
    );

    window.addEventListener(
        "storage",
        renderAdmin
    );
}

/* =========================================================
   RENDER ADMIN INVENTORY
   ========================================================= */

function renderAdmin() {
    const data = loadData();

    const toolSelect =
        document.querySelector("#assignTool");

    if (!toolSelect) {
        return;
    }

    const availableTools = data.tools.filter(tool => {
        return available(tool) > 0;
    });

    if (availableTools.length > 0) {
        toolSelect.innerHTML = availableTools
            .map(tool => {
                return `
                    <option value="${tool.id}">
                        ${escapeHTML(tool.name)}
                        (${available(tool)} free)
                    </option>
                `;
            })
            .join("");
    } else {
        toolSelect.innerHTML = `
            <option value="">
                No tools available
            </option>
        `;
    }

    document.querySelector(
        "#assignBtn"
    ).disabled = availableTools.length === 0;

    const inventoryContainer =
        document.querySelector("#adminInventory");

    if (data.tools.length === 0) {
        inventoryContainer.innerHTML = `
            <div class="empty">
                No tools are currently in inventory.
                Add the first tool above.
            </div>
        `;

        return;
    }

    inventoryContainer.innerHTML = data.tools
        .map(tool => {
            const currentAssignments =
                tool.assignments.length > 0
                    ? `
                        <div class="current-list">
                            ${tool.assignments
                                .map(assignment => {
                                    return `
                                        <div class="current-item">
                                            <div class="assignment-person">
                                                <strong>
                                                    ${escapeHTML(
                                                        assignment.technician
                                                    )}
                                                </strong>

                                                <small>
                                                    ${escapeHTML(
                                                        assignment.site
                                                    )}
                                                    • Assigned
                                                    ${prettyDate(
                                                        assignment.assignedDate
                                                    )}
                                                </small>
                                            </div>

                                            <div class="current-actions">
                                                <button
                                                    class="transfer-button"
                                                    data-action="transfer"
                                                    data-tool="${tool.id}"
                                                    data-assignment="${assignment.id}"
                                                >
                                                    Transfer
                                                </button>

                                                <button
                                                    data-action="release"
                                                    data-tool="${tool.id}"
                                                    data-assignment="${assignment.id}"
                                                >
                                                    Release
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                })
                                .join("")}
                        </div>
                    `
                    : "";

            return `
                <article class="inventory-row">
                    <div class="inventory-head">
                        <div>
                            <h2>
                                ${escapeHTML(tool.name)}
                            </h2>

                            <p>
                                ${escapeHTML(tool.description)}
                                •
                                ${available(tool)}
                                of
                                ${tool.quantity}
                                available
                            </p>
                        </div>

                        <label>
                            Quantity

                            <input
                                data-quantity="${tool.id}"
                                type="number"
                                min="${Math.max(
                                    1,
                                    tool.assignments.length
                                )}"
                                step="1"
                                value="${tool.quantity}"
                            >
                        </label>

                        <div class="inventory-actions">
                            <button
                                data-action="save"
                                data-tool="${tool.id}"
                            >
                                Save
                            </button>

                            <button
                                class="danger-button"
                                data-action="remove"
                                data-tool="${tool.id}"
                            >
                                Remove
                            </button>
                        </div>
                    </div>

                    ${currentAssignments}
                </article>
            `;
        })
        .join("");
}

/* =========================================================
   START THE CORRECT PAGE
   ========================================================= */

if (document.body.dataset.page === "request") {
    initRequest();
}

if (document.body.dataset.page === "admin") {
    initAdmin();
}
