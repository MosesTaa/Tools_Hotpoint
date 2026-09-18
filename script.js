"use strict";

/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const URL =
    "https://ncylczvijvdaiaamhmwk.supabase.co";

const KEY =
    "sb_publishable_hNUwSYtyf0jU7ARbvai3gw_1xbNlyMe";

const ADMIN_EMAIL =
    "mosesntella2018@gmail.com";

const ADMIN_USERNAME = "ADMIN";
const ADMIN_PASSWORD = "Hotpoint_Tools";

let token =
    localStorage.getItem("hp_access") || "";

let tools = [];
let history = [];

const $ = selector =>
    document.querySelector(selector);

const escapeHTML = value => {
    return String(value ?? "").replace(
        /[&<>'"]/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        })[character]
    );
};

const formatDate = value => {
    if (!value) {
        return "—";
    }

    return new Date(
        `${value}T00:00:00`
    ).toLocaleDateString("en-GB");
};

const today = () =>
    new Date().toISOString().slice(0, 10);

/* =========================================================
   SUPABASE REQUEST
   ========================================================= */

function createHeaders(admin = false) {
    return {
        apikey: KEY,

        Authorization:
            `Bearer ${
                admin && token
                    ? token
                    : KEY
            }`,

        "Content-Type": "application/json"
    };
}

function showMessage(text, type = "ok") {
    const message = $("#message");

    message.textContent = text;
    message.className = type;

    setTimeout(() => {
        message.textContent = "";
        message.className = "";
    }, 4500);
}

async function api(path, options = {}) {
    const response = await fetch(
        URL + path,
        {
            ...options,

            headers: {
                ...createHeaders(options.admin),
                ...(options.headers || {})
            }
        }
    );

    if (
        response.status === 401 &&
        options.admin
    ) {
        token = "";

        localStorage.removeItem("hp_access");

        showAuthentication();
    }

    /*
     * Supabase sometimes sends an empty response after
     * adding, editing or deleting a record.
     */

    const responseText =
        await response.text();

    let responseData = null;

    if (responseText) {
        try {
            responseData =
                JSON.parse(responseText);
        } catch (error) {
            responseData = responseText;
        }
    }

    if (!response.ok) {
        const errorData =
            responseData &&
            typeof responseData === "object"
                ? responseData
                : {};

        throw new Error(
            errorData.message ||
            errorData.error_description ||
            errorData.details ||
            `Request failed (${response.status})`
        );
    }

    return responseData;
}

/* =========================================================
   LOAD TOOLS AND HISTORY
   ========================================================= */

async function loadData() {
    try {
        const responses =
            await Promise.all([
                api(
                    "/rest/v1/tools" +
                    "?select=*" +
                    "&order=name"
                ),

                api(
                    "/rest/v1/tool_history" +
                    "?select=*" +
                    "&order=assigned_on.desc,created_at.desc"
                )
            ]);

        tools = responses[0] || [];
        history = responses[1] || [];

        localStorage.setItem(
            "hp_cache",
            JSON.stringify({
                tools,
                history
            })
        );

        renderApplication();
    } catch (error) {
        const cachedData = JSON.parse(
            localStorage.getItem(
                "hp_cache"
            ) || "null"
        );

        if (cachedData) {
            tools = cachedData.tools || [];
            history = cachedData.history || [];

            renderApplication();

            showMessage(
                "Offline: showing the last synchronized records.",
                "error"
            );
        } else {
            showMessage(
                error.message,
                "error"
            );
        }
    }
}

function getActiveAllocations() {
    return history.filter(record => {
        return !record.ended_on;
    });
}

/* =========================================================
   RENDER APPLICATION
   ========================================================= */

function renderApplication() {
    const allocations =
        getActiveAllocations();

    const searchText =
        $("#search").value.toLowerCase();

    const totalUnits = tools.reduce(
        (total, tool) => {
            return total + tool.quantity;
        },
        0
    );

    $("#total").textContent =
        totalUnits;

    $("#out").textContent =
        allocations.length;

    $("#free").textContent =
        Math.max(
            0,
            totalUnits - allocations.length
        );

    renderPublicTools(
        allocations,
        searchText
    );

    renderHistory();

    renderToolOptions(allocations);

    renderActiveAllocations(allocations);

    renderToolManagement(allocations);
}

/* =========================================================
   PUBLIC TOOL CARDS
   ========================================================= */

function renderPublicTools(
    allocations,
    searchText
) {
    const matchingTools =
        tools.filter(tool => {
            const toolAllocations =
                allocations.filter(record => {
                    return (
                        record.tool_id ===
                        tool.id
                    );
                });

            const searchableText = `
                ${tool.name}
                ${tool.description}
                ${toolAllocations
                    .map(record => {
                        return (
                            record.technician +
                            " " +
                            record.site
                        );
                    })
                    .join(" ")}
            `.toLowerCase();

            return searchableText.includes(
                searchText
            );
        });

    $("#tools").innerHTML =
        matchingTools.map(tool => {
            const toolAllocations =
                allocations.filter(record => {
                    return (
                        record.tool_id ===
                        tool.id
                    );
                });

            const availableQuantity =
                Math.max(
                    0,
                    tool.quantity -
                    toolAllocations.length
                );

            return `
                <article class="tool">
                    <h3>
                        ${escapeHTML(tool.name)}
                    </h3>

                    <p class="tool-description">
                        ${escapeHTML(
                            tool.description
                        )}
                    </p>

                    <div class="counts">
                        <span>
                            Total: ${tool.quantity}
                        </span>

                        <span>
                            Free: ${availableQuantity}
                        </span>

                        <span>
                            Out: ${toolAllocations.length}
                        </span>
                    </div>

                    ${toolAllocations
                        .map(record => {
                            return `
                                <div class="holder">
                                    <b>
                                        ${escapeHTML(
                                            record.technician
                                        )}
                                    </b>

                                    <br>

                                    <small>
                                        ${escapeHTML(
                                            record.site
                                        )}
                                        •
                                        ${formatDate(
                                            record.assigned_on
                                        )}
                                    </small>
                                </div>
                            `;
                        })
                        .join("")}
                </article>
            `;
        }).join("") ||
        "No matching tools.";
}

/* =========================================================
   ALLOCATION HISTORY
   ========================================================= */

function renderHistory() {
    $("#history").innerHTML =
        history.map(record => {
            const tool = tools.find(item => {
                return (
                    item.id === record.tool_id
                );
            });

            return `
                <tr>
                    <td>
                        ${escapeHTML(
                            record.technician
                        )}
                    </td>

                    <td>
                        ${escapeHTML(record.site)}
                    </td>

                    <td>
                        ${escapeHTML(
                            tool?.name ||
                            "Removed tool"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            record.assigned_on
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            record.ended_on
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            record.action
                        )}
                    </td>
                </tr>
            `;
        }).join("");
}

/* =========================================================
   AVAILABLE TOOL DROPDOWN
   ========================================================= */

function renderToolOptions(allocations) {
    const availableTools =
        tools.filter(tool => {
            const allocationCount =
                allocations.filter(record => {
                    return (
                        record.tool_id ===
                        tool.id
                    );
                }).length;

            return (
                allocationCount <
                tool.quantity
            );
        });

    $("#toolSelect").innerHTML =
        availableTools.map(tool => {
            return `
                <option value="${tool.id}">
                    ${escapeHTML(tool.name)}
                </option>
            `;
        }).join("");

    $("#assign button").disabled =
        availableTools.length === 0;
}

/* =========================================================
   ACTIVE ALLOCATIONS
   ========================================================= */

function renderActiveAllocations(
    allocations
) {
    $("#active").innerHTML =
        allocations.map(record => {
            const tool = tools.find(item => {
                return (
                    item.id ===
                    record.tool_id
                );
            });

            return `
                <div class="allocation">
                    <span>
                        <b>
                            ${escapeHTML(
                                tool?.name ||
                                "Tool"
                            )}
                        </b>

                        <br>

                        ${escapeHTML(
                            record.technician
                        )}
                        •
                        ${escapeHTML(record.site)}
                        •
                        ${formatDate(
                            record.assigned_on
                        )}
                    </span>

                    <div class="actions">
                        <button
                            data-transfer="${record.id}"
                        >
                            Transfer
                        </button>

                        <button
                            class="dark"
                            data-release="${record.id}"
                        >
                            Release
                        </button>
                    </div>
                </div>
            `;
        }).join("") ||
        "No tools are currently allocated.";
}

/* =========================================================
   MANAGE TOOLS
   ========================================================= */

function renderToolManagement(
    allocations
) {
    $("#manageTools").innerHTML =
        tools.map(tool => {
            const allocatedQuantity =
                allocations.filter(record => {
                    return (
                        record.tool_id ===
                        tool.id
                    );
                }).length;

            const minimumQuantity =
                Math.max(
                    1,
                    allocatedQuantity
                );

            return `
                <div class="managed-tool">
                    <div class="managed-tool-heading">
                        <b>
                            ${escapeHTML(tool.name)}
                        </b>

                        <small>
                            ${tool.quantity} total
                            •
                            ${allocatedQuantity}
                            currently allocated
                        </small>
                    </div>

                    <div class="managed-tool-fields">
                        <label>
                            Quantity

                            <input
                                type="number"
                                min="${minimumQuantity}"
                                step="1"
                                value="${tool.quantity}"
                                data-tool-quantity="${tool.id}"
                            >
                        </label>

                        <label>
                            Description

                            <textarea
                                rows="2"
                                data-tool-description="${tool.id}"
                            >${escapeHTML(
                                tool.description
                            )}</textarea>
                        </label>
                    </div>

                    <div class="managed-tool-actions">
                        <button
                            data-save-tool="${tool.id}"
                            data-allocated="${allocatedQuantity}"
                        >
                            Save Changes
                        </button>

                        <button
                            class="remove"
                            data-remove-tool="${tool.id}"
                            data-tool-name="${escapeHTML(
                                tool.name
                            )}"
                            ${
                                allocatedQuantity > 0
                                    ? `disabled title="Release allocated units first"`
                                    : ""
                            }
                        >
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }).join("") ||
        "No tools have been added.";
}

/* =========================================================
   AUTHENTICATION DISPLAY
   ========================================================= */

function showAuthentication() {
    const loggedIn = Boolean(token);

    $("#login").hidden = loggedIn;
    $("#adminPanel").hidden = !loggedIn;
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

document
    .querySelectorAll("nav button")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                document
                    .querySelectorAll(
                        "nav button"
                    )
                    .forEach(item => {
                        item.classList.remove(
                            "active"
                        );
                    });

                button.classList.add(
                    "active"
                );

                const adminPage =
                    button.dataset.view ===
                    "admin";

                $("#publicView").hidden =
                    adminPage;

                $("#adminView").hidden =
                    !adminPage;

                showAuthentication();
            }
        );
    });

/* =========================================================
   DEFAULT VALUES
   ========================================================= */

$("#assignDate").value = today();
$("#transferDate").value = today();

/* =========================================================
   REFRESH AND SEARCH
   ========================================================= */

$("#refresh").addEventListener(
    "click",
    loadData
);

$("#search").addEventListener(
    "input",
    renderApplication
);

/* =========================================================
   ADMIN LOGIN
   ========================================================= */

$("#login").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const username =
            $("#username")
                .value
                .trim()
                .toUpperCase();

        const password =
            $("#password").value;

        if (
            username !== ADMIN_USERNAME ||
            password !== ADMIN_PASSWORD
        ) {
            showMessage(
                "Incorrect username or password.",
                "error"
            );

            return;
        }

        try {
            const response = await api(
                "/auth/v1/token" +
                "?grant_type=password",
                {
                    method: "POST",

                    body: JSON.stringify({
                        email: ADMIN_EMAIL,
                        password
                    })
                }
            );

            token = response.access_token;

            localStorage.setItem(
                "hp_access",
                token
            );

            showAuthentication();

            showMessage(
                "Administrator signed in."
            );

            await loadData();
        } catch (error) {
            showMessage(
                "Supabase rejected the login. " +
                "Set the admin user's password " +
                "to Hotpoint_Tools.",
                "error"
            );
        }
    }
);

/* =========================================================
   LOGOUT
   ========================================================= */

$("#logout").addEventListener(
    "click",
    () => {
        token = "";

        localStorage.removeItem(
            "hp_access"
        );

        showAuthentication();

        showMessage("Signed out.");
    }
);

/* =========================================================
   ADD A NEW TOOL
   ========================================================= */

$("#addTool").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const name =
            $("#toolName").value.trim();

        const quantity =
            Number($("#quantity").value);

        const description =
            $("#description").value.trim();

        if (!name) {
            showMessage(
                "Enter the tool name.",
                "error"
            );

            return;
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            showMessage(
                "Quantity must be a whole number of at least 1.",
                "error"
            );

            return;
        }

        if (!description) {
            showMessage(
                "Enter the tool description.",
                "error"
            );

            return;
        }

        try {
            await api(
                "/rest/v1/tools",
                {
                    admin: true,
                    method: "POST",

                    headers: {
                        Prefer:
                            "return=minimal"
                    },

                    body: JSON.stringify({
                        name,
                        quantity,
                        description
                    })
                }
            );

            event.target.reset();

            $("#quantity").value = 1;

            showMessage(
                "Tool added successfully."
            );

            await loadData();
        } catch (error) {
            showMessage(
                error.message,
                "error"
            );
        }
    }
);

/* =========================================================
   EDIT OR REMOVE TOOLS
   ========================================================= */

$("#manageTools").addEventListener(
    "click",
    async event => {
        /*
         * Save the edited quantity and description.
         */

        const saveButton =
            event.target.closest(
                "[data-save-tool]"
            );

        if (saveButton) {
            const toolId =
                saveButton.dataset.saveTool;

            const allocatedQuantity =
                Number(
                    saveButton.dataset.allocated
                );

            const quantityInput =
                document.querySelector(
                    `[data-tool-quantity="${toolId}"]`
                );

            const descriptionInput =
                document.querySelector(
                    `[data-tool-description="${toolId}"]`
                );

            const quantity =
                Number(quantityInput.value);

            const description =
                descriptionInput.value.trim();

            if (
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                showMessage(
                    "Quantity must be a whole number of at least 1.",
                    "error"
                );

                return;
            }

            if (
                quantity <
                allocatedQuantity
            ) {
                showMessage(
                    `Quantity cannot be below ${allocatedQuantity} because those units are currently allocated.`,
                    "error"
                );

                return;
            }

            if (!description) {
                showMessage(
                    "Enter a tool description.",
                    "error"
                );

                return;
            }

            try {
                await api(
                    `/rest/v1/tools?id=eq.${encodeURIComponent(
                        toolId
                    )}`,
                    {
                        admin: true,
                        method: "PATCH",

                        headers: {
                            Prefer:
                                "return=minimal"
                        },

                        body: JSON.stringify({
                            quantity,
                            description
                        })
                    }
                );

                showMessage(
                    "Tool details updated."
                );

                await loadData();
            } catch (error) {
                showMessage(
                    error.message,
                    "error"
                );
            }

            return;
        }

        /*
         * Remove an unallocated tool.
         */

        const removeButton =
            event.target.closest(
                "[data-remove-tool]"
            );

        if (
            !removeButton ||
            removeButton.disabled
        ) {
            return;
        }

        const toolName =
            removeButton.dataset.toolName;

        const shouldRemove = confirm(
            `Remove ${toolName}?`
        );

        if (!shouldRemove) {
            return;
        }

        try {
            const toolId =
                encodeURIComponent(
                    removeButton.dataset
                        .removeTool
                );

            await api(
                `/rest/v1/tools?id=eq.${toolId}`,
                {
                    admin: true,
                    method: "DELETE",

                    headers: {
                        Prefer:
                            "return=minimal"
                    }
                }
            );

            showMessage(
                `${toolName} removed successfully.`
            );

            await loadData();
        } catch (error) {
            const errorMessage =
                /foreign key|violates/i.test(
                    error.message
                )
                    ? (
                        "This tool has allocation " +
                        "history and cannot be " +
                        "permanently deleted."
                    )
                    : error.message;

            showMessage(
                errorMessage,
                "error"
            );
        }
    }
);

/* =========================================================
   ASSIGN TOOL
   ========================================================= */

$("#assign").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const selectedTool =
            $("#toolSelect").value;

        const technician =
            $("#technician").value.trim();

        const site =
            $("#site").value.trim();

        const assignmentDate =
            $("#assignDate").value;

        if (!selectedTool) {
            showMessage(
                "There are no available tools.",
                "error"
            );

            return;
        }

        if (!technician || !site) {
            showMessage(
                "Enter the technician and site.",
                "error"
            );

            return;
        }

        try {
            await api(
                "/rest/v1/rpc/assign_tool",
                {
                    admin: true,
                    method: "POST",

                    body: JSON.stringify({
                        p_tool_id:
                            selectedTool,

                        p_technician:
                            technician,

                        p_site:
                            site,

                        p_date:
                            assignmentDate
                    })
                }
            );

            event.target.reset();

            $("#assignDate").value =
                today();

            showMessage(
                "Tool assigned successfully."
            );

            await loadData();
        } catch (error) {
            showMessage(
                error.message,
                "error"
            );
        }
    }
);

/* =========================================================
   RELEASE OR OPEN TRANSFER
   ========================================================= */

$("#active").addEventListener(
    "click",
    async event => {
        const releaseId =
            event.target.dataset.release;

        const transferId =
            event.target.dataset.transfer;

        if (
            releaseId &&
            confirm("Release this tool?")
        ) {
            try {
                await api(
                    "/rest/v1/rpc/release_tool",
                    {
                        admin: true,
                        method: "POST",

                        body: JSON.stringify({
                            p_history_id:
                                releaseId,

                            p_date:
                                today()
                        })
                    }
                );

                showMessage(
                    "Tool released."
                );

                await loadData();
            } catch (error) {
                showMessage(
                    error.message,
                    "error"
                );
            }
        }

        if (transferId) {
            const allocation =
                history.find(record => {
                    return (
                        record.id ===
                        transferId
                    );
                });

            if (!allocation) {
                return;
            }

            $("#historyId").value =
                transferId;

            $("#transferText").textContent =
                `Transfer from ` +
                `${allocation.technician} ` +
                `at ${allocation.site}`;

            $("#transferDate").value =
                today();

            $("#transfer").showModal();
        }
    }
);

/* =========================================================
   TRANSFER TOOL
   ========================================================= */

$("#cancel").addEventListener(
    "click",
    () => {
        $("#transfer").close();
    }
);

$("#transferForm").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const newTechnician =
            $("#newTechnician")
                .value
                .trim();

        const newSite =
            $("#newSite")
                .value
                .trim();

        if (!newTechnician || !newSite) {
            showMessage(
                "Enter the new technician and site.",
                "error"
            );

            return;
        }

        try {
            await api(
                "/rest/v1/rpc/transfer_tool",
                {
                    admin: true,
                    method: "POST",

                    body: JSON.stringify({
                        p_history_id:
                            $("#historyId").value,

                        p_technician:
                            newTechnician,

                        p_site:
                            newSite,

                        p_date:
                            $("#transferDate").value
                    })
                }
            );

            $("#transfer").close();

            event.target.reset();

            showMessage(
                "Tool transferred."
            );

            await loadData();
        } catch (error) {
            showMessage(
                error.message,
                "error"
            );
        }
    }
);

/* =========================================================
   START APPLICATION
   ========================================================= */

showAuthentication();
loadData();

setInterval(
    loadData,
    60000
);
