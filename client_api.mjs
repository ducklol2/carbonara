export async function add(title, content) {
  return await jsonPost('/note/add', {
    title, content
  });
}

export async function update(rowid, title, content) {
  return await jsonPost('/note/update', {
    rowid, title, content
  });
}

export async function remove(rowid) {
  return await jsonPost('/note/remove', { rowid });
}

export async function list() {
  return (await jsonGet('/note/list')).notes;
}

async function jsonPost(path, body) {
  const response = await fetch(path, {
    method: "POST",
    "Content-type": "application/json",
    body: JSON.stringify(body)
  });

  return new Promise(async (resolve, reject) => {
    if (response.ok) resolve(await response.json());
    else {
      console.error(path, 'failed:', response);
      reject();
    }
  });
}

async function jsonGet(path, body) {
  const response = await fetch(path, {
    method: "GET",
    "Content-type": "application/json"
  });

  return new Promise(async (resolve, reject) => {
    if (response.ok) resolve(await response.json());
    else {
      console.error(path, 'failed:', response);
      reject();
    }
  });
}