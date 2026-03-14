export async function publishX(content: any,media: any,connection: { access_token: any }){

const res = await fetch("https://api.x.com/2/tweets",{
method:"POST",
headers:{
"Authorization":`Bearer ${connection.access_token}`,
"Content-Type":"application/json"
},
body:JSON.stringify({
text:content
})
})

const data=await res.json()

if(!res.ok){

return{
success:false,
error:data.detail
}

}

return{
success:true,
postId:data.data.id,
url:`https://x.com/i/web/status/${data.data.id}`
}

}