export async function publishThreads(content,media,connection){

const res=await fetch(
`https://graph.threads.net/v1.0/${connection.platform_user_id}/threads`,
{
method:"POST",
headers:{
Authorization:`Bearer ${connection.access_token}`,
"Content-Type":"application/json"
},
body:JSON.stringify({
text:content
})
}
)

const data=await res.json()

if(data.error){
return{
success:false,
error:data.error.message
}
}

return{
success:true,
postId:data.id
}

}